# 1. Start from a base image
FROM python:3.10-slim

# 2. Set the working directory
WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y libmagic1

# 3. Copy dependency manifest
COPY requirements.txt ./

# 4. Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy application source code
COPY . .

# 6. Expose the port
EXPOSE 5000

# 7. Define the startup command
CMD [ "python", "chat.py" ]