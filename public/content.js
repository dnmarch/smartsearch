/*global chrome*/
function doSearch(text, backgroundColor) {

    console.log("doing search")
    if (window.find && window.getSelection) {
        document.designMode = "on";
        var sel = window.getSelection();
        sel.collapse(document.body, 0);

        while (window.find(text)) {
            document.execCommand("HiliteColor", false, backgroundColor);
            sel.collapseToEnd();
        }
        document.designMode = "off";
    }
}

function unhighlight(node) {
    if (node.nodeType === 1) {
        node.style.backgroundColor = "";
    }
    var child = node.firstChild;
    while (child) {
        unhighlight(child);
        child = child.nextSibling;
    }
}

//window.onload = doSearch;
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");

        // Suppose to get the highlight text from back-end
        // Now just highlight the question(user input text)
        const question = request.greeting
        unhighlight(document.body)
        doSearch(question, 'yellow')

    }
);


/*
// Cannot do processing on
async function predict(question) {
    const { initModel, QAClient } = require("question-answering");
    var passages = document.body.innerText.split("\n")
    var scores = []
    var answers = []
    for (const text in passages) {
        const qaClient = await QAClient.fromOptions();
        const answer = await qaClient.predict(question, text);
        const score = answer['score']
        scores.push(score)
        if (score > 0.1) {
            answers.push(text)
        }
    }
    console.log(scores)


    for (const answer in answers) {
        doSearch(answer, 'yellow')
    }

}*/


let urls = new Set()
const numLinks = document.links.length
for ( var i = 0; i < numLinks; i++ ) {
    if (document.links[i].href !== "" && !document.links[i].href.includes("google")) {
        urls.add(document.links[i].href)
    }
}





for (let item of urls) console.log(item)