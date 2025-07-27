# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the requirements file
COPY requirements.txt ./

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Bundle app source
COPY . .

# Your app binds to port 5000
EXPOSE 5000

# Define the command to run your app
CMD [ "python", "chat.py" ]
