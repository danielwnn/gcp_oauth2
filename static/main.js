// show/hide the veil 
function toggleVeil(shown) {
    var veil = document.getElementById("veil");
    veil.style.display = shown ? "block" : "none";
}

// set the hash path
function setHashPath(path) {
    if (location.hash === "#" + path) {
        deploy(path);
    } else {
        location.hash = path;
    }
}

// get the path without hash
function getHashPath() {
    return location.hash.length > 0 ? location.hash.substring(1) : "";
}

// open a popup window for oauth2 user consent
function openPopWindow(url, target, width, height) {
    var top = (screen.height - height) / 2;
    var left = (screen.width - width) / 2;
    var position = ",width=" + width + ",height=" + height + ",top=" + top + ",left=" + left;
    var popupWin = window.open(
        url, target, 
        "popup=yes,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes" + position);
    popupWin.focus();
}

// deploy the demo
function deploy(path) {    
    // do nothing if path is undefined, null or empty
    if (!path) return;

    // result div
    var result = document.getElementById('result');

    fetch(path, {
        method: 'POST',
        body: {}
    })
    .then(async function(response) {
        if (response.status == 401) {
            openPopWindow("/authorize", "oauth2", 800, 600);
            toggleVeil(true);
        } else {
            var data = await response.json();
            if (response.ok) {
                result.innerHTML = "<a target='_blank' href='" + data.metadata.build.logUrl + "'>Click here to see the deployment in progress.</a>";
            } else {
                result.innerHTML = data.error.message;
            }
        }
    })
    .catch(error => {
        result.innerHTML = "Error: " + error;
    });
}

// popup window callback
window.onload = function() {
    if (window.opener != null && !window.opener.closed) {
        window.opener.setHashPath(location.href.split("#")[1]);
        window.opener.toggleVeil(false);
        window.close();
    } else {
        // load angular
        console.log("onload: " + location.hash);
        deploy(getHashPath());
    }
}

// parent window - trigger on hashchange
window.onhashchange = function() {
    console.log("onhashchange: " + location.hash);
    deploy(getHashPath());
}

