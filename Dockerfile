FROM centos/nodejs-6-centos7:6

WORKDIR /opt/app-root/src

COPY ./server.js /opt/app-root/src
COPY ./package.json /opt/app-root/src
RUN mkdir ./templates
COPY ./templates/* ./templates/
RUN mkdir ./templatestore

RUN npm install

CMD node ./server.js
