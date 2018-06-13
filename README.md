# bespoke
Sample nodejs applications using the tailor layout pattern (one tailor server, several fragment servers). Created to play around with fragment handling and CSS/JS conflicts between template/fragments in particular.

#### Usage:

    npm install
    node server.js

Then, in separate shells:

    cd fragment_<x>
    node server.js

Then open http://localhost:8080/index in a browser.
