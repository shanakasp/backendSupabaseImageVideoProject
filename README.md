docker build -t node-application .

docker images

docker tag node-application shanakaprince/node-application:latest

docker push shanakaprince/node-application:latest
