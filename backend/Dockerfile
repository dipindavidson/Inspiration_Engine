# -Use an official Node.js runtime as our base image
FROM node:22-alpine

# -Set the working directory inside the container
WORKDIR /app

# -Copy server.js file to /app
COPY server.js .

# -Expose port 3000 so outside traffic can talk to it
EXPOSE 3000

#Command to run in Exec form (array)
CMD ["node", "server.js"]