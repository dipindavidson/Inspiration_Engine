const http = require('http');
const https = require('https');
const os = require('os');

const port = 3000;

// Grab the API key from environment variables (we will inject this via K8s Secrets later)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';

const server = http.createServer((req, res) => {
    // Enable CORS for frontend communication
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    // Changing the endpoint to a POST request to receive user text
    if (req.url === '/api/verse' && req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            let userInput = '';
            try {
                const parsedBody = JSON.parse(body);
                userInput = parsedBody.text || '';
            } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Invalid JSON payload" }));
                return;
            }

            // Simple validation guardrail check before calling the AI
            if (!userInput.trim() || userInput.trim().length < 5) {
                res.statusCode = 200;
                res.end(JSON.stringify({
                    verse: "Please share a bit more about your day.",
                    reference: "System Input Check",
                    explanation: "We need a short sentence describing how you feel or what happened today to find a meaningful reflection.",
                    containerId: os.hostname()
                }));
                return;
            }

            if (!GEMINI_API_KEY) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: "Gemini API Key missing on backend server configuration." }));
                return;
            }

            // Define the strict guardrail instructions for the AI model
            const systemInstruction = 
                "You are a compassionate, context-aware Bible Companion. " +
                "Analyze the user's text about their day and select a highly appropriate, comforting, or reflective Bible verse. " +
                "To comply with safety and avoid verbatim recitation blocks, provide the reference and briefly summarize or paraphrase the verse passage contextually in your own words if it is long. " +
                "You MUST respond ONLY with a raw, valid JSON object matching this structure exactly: {\"verse\": \"Paraphrased text/verse\", \"reference\": \"Book Chapter:Verse\", \"explanation\": \"Connection explanation\"}";

            // Payload structure for the Gemini 1.5 Flash model API
            const geminiPayload = JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemInstruction}\n\nUser's Day: "${userInput}"` }]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;

            const externalReq = https.request(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, (externalRes) => {
                let geminiData = '';
                externalRes.on('data', d => geminiData += d);
                externalRes.on('end', () => {
                    console.log("RAW GEMINI RESPONSE:", geminiData);
                    try {
                        const geminiJson = JSON.parse(geminiData);

                        // If Google returns an error object (like a 503 high demand capacity spike)
                        if (externalRes.statusCode !== 200 || geminiJson.error) {
                            res.statusCode = externalRes.statusCode || 502;
                            res.end(JSON.stringify({ 
                                error: geminiJson.error?.message || `Downstream engine issue (Status ${externalRes.statusCode})` 
                            }));
                            return;
                        }

                        // Extract text string containing our expected JSON structure
                        const rawTextResponse = geminiJson.candidates[0].content.parts[0].text;
                        const parsedVerseData = JSON.parse(rawTextResponse);

                        // Attach the container ID for tracking cluster performance
                        parsedVerseData.containerId = os.hostname();

                        res.statusCode = 200;
                        res.end(JSON.stringify(parsedVerseData));
                    } catch (err) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: "Failed to parse AI model response layout cleanly." }));
                    }
                });
            });

            externalReq.on('error', (e) => {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: "Network error linking to external AI engine." }));
            });

            externalReq.write(geminiPayload);
            externalReq.end();
        });
    } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Endpoint not found" }));
    }
});

server.listen(port, () => {
    console.log(`Contextual Bible Companion backend running on port ${port}`);
});