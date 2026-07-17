# Step 1: Use the official lightweight Nginx image
FROM nginx:alpine

# Step 2: Copy your local default.conf into the container's config folder
COPY default.conf /etc/nginx/conf.d/default.conf

# Step 3: Copy your static frontend files into the Nginx public folder
COPY index.html /usr/share/nginx/html/index.html

# Step 4: Expose port 80 to allow external traffic
EXPOSE 80

# Step 5: Start Nginx in the foreground so the container stays active
CMD ["nginx", "-g", "daemon off;"]