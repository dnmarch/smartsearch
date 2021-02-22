/*global chrome*/

const SEP = "%$"


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
        const answers = request.greeting
        let answer_list = answers.split(SEP)
        const clearHighlight = answer_list[0]
        if (clearHighlight === "clear highlight") {
            unhighlight(document.body)
        }


        console.log("receive answer")
        console.log(answers)
        console.log(answers.length)

        console.log(answer_list)
        for (var i = 1; i < answer_list.length; i++) {
            const answer = answer_list[i]
            console.log("inside for loop")
            console.log(answer)

            if (answer.length < 2) continue

            console.log("searching answer")
            console.log(answer)
            doSearch(answer, 'yellow')
            console.log("searching answer end")
        }


    }
);



let urls = new Set()
const numLinks = document.links.length
for ( var i = 0; i < numLinks; i++ ) {
    if (document.links[i].href !== "" && !document.links[i].href.includes("google")) {
        urls.add(document.links[i].href)
    }
}





//for (let item of urls) console.log(item)