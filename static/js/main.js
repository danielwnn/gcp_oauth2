"use strict";

// Public Domain/MIT
function generateUUID() { 
  var d = new Date().getTime();//Timestamp
  var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16;//random number between 0 and 16
      if(d > 0){//Use timestamp until depleted
          r = (d + r)%16 | 0;
          d = Math.floor(d/16);
      } else {//Use microseconds since page-load if supported
          r = (d2 + r)%16 | 0;
          d2 = Math.floor(d2/16);
      }
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// convert form data to JSON
function formData2JSON(form) {
  var formData = new FormData(form);
  var obj = Object.fromEntries(
    Array.from(formData.keys()).map(
      key => [key, formData.getAll(key).length > 1 ? formData.getAll(key) : formData.get(key)]
    )
  );
  return obj;
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


// selector helper
const select = (el, all = false) => {
  el = el.trim()
  if (all) {
    return [...document.querySelectorAll(el)]
  } else {
    return document.querySelector(el)
  }
}

// event listener
const on = (type, el, listener, all = false) => {
  if (all) {
    select(el, all).forEach(e => e.addEventListener(type, listener))
  } else {
    select(el, all).addEventListener(type, listener)
  }
}

// window onscroll event listener 
const onscroll = (el, listener) => {
  el.addEventListener('scroll', listener)
}

// Sidebar toggle
if (select('.toggle-sidebar-btn')) {
  on('click', '.toggle-sidebar-btn', function(e) {
    select('body').classList.toggle('toggle-sidebar')
  });
}

// Search bar toggle
if (select('.search-bar-toggle')) {
  on('click', '.search-bar-toggle', function(event) {
    event.preventDefault();
    event.stopPropagation();
    select('.search-bar').classList.toggle('search-bar-show')
  })
}

// Back to top button
let backtotop = select('.back-to-top')
if (backtotop) {
  backtotop.onclick = function(event) {
    event.preventDefault();
    event.stopPropagation();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const toggleBacktotop = function() {
    if (window.scrollY > 100) {
      backtotop.classList.add('active');
    } else {
      backtotop.classList.remove('active');
    }
  }
  window.addEventListener('load', toggleBacktotop);
  onscroll(document, toggleBacktotop);
}

// Initiate tooltips
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl)
});

// update breadcrumb
let BREADCRUMB_LABELS = {
  "dashboard": "Dashboard",
  "demos": "Demos",
  "demo-list": "Demo List",
  "my-demos": "My Demos",
  "demo-onboard": "Demo Onboard",
  "demo-update" : "Demo Update",
  "oss": "OSS",
  "agones": "Agones",
  "open-match": "Open Match",
  "open-saves": "Open Saves",
  "clean-chat": "Clean Chat",
  "quilkin": "Quilkin"
};

function updateBreadcrumb(hashPath) {
  let innerHTML = '<li class="breadcrumb-item active">Home</li>';

  let paths = hashPath.split("/");
  if (paths.length > 2) {
    innerHTML = '<li class="breadcrumb-item"><a href="#/dashboard">Home</a></li>';
    for (let i=1; i < paths.length; i++) {
      innerHTML += `<li class="breadcrumb-item active">${BREADCRUMB_LABELS[paths[i]]}</li>`;
    }
  }
  select('#breadcrumb').innerHTML = innerHTML;
}

// update the selected Nav Menu
let curHashPath, prevHashPath;
function updateSidebarSelected() {
  let selected = select(`a[href="#${prevHashPath}"]`);
  if (selected) selected.classList.remove("active");
  selected = select(`a[href="#${curHashPath}"]`);
  if (selected) selected.classList.add("active");
}

// update the demo list content
let demoList = [];
let demoDict = {};
function updateDemoList() {
  if (demoList.length > 0) {
    let innerHTML = "";
    for (let i=0; i < demoList.length; i++) {
      innerHTML += 
        `<div class="col-lg-4">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">${demoList[i].name}</h5>
              <span>${demoList[i].description}</span>
            </div>
            <div class="card-footer text-end">
              <button class="btn btn-outline-primary btn-sm float-start" onclick="alert('${demoList[i].id}')"><i class="bi bi-cloud-arrow-up-fill me-1"></i>Deploy</button>
              <button class="btn btn-outline-danger btn-sm float-end" onclick="alert('${demoList[i].id}')">Delete</button>
              <button class="btn btn-outline-success btn-sm float-end me-2" onclick="alert('${demoList[i].id}')">Update</button>
            </div>
          </div>
        </div>`;
    }
    select('#demoList').innerHTML = innerHTML;
  } else {
    select('#demoListInfo').innerHTML = 
    `<div class="alert alert-info alert-dismissible fade show" role="alert">
      <i class="bi bi-info-circle me-1"></i> No demos available to show.
    </div>`;
  }
}

function updateDemoListPage() {
  select('#mainContent').innerHTML = 
    `<div class="row">
      <div id="demoListInfo" class="col-6 mb-3"></div>
      <div class="col-6 text-end mb-3">
        <button id="btnOnboard" class="btn btn-outline-primary btn-sm">
          <i class="bi bi-box-arrow-in-right me-1"></i>Onboard New Demo
        </button>
      </div>
    </div>
    <div id="demoList" class="row"></div>`;

  on('click', '#btnOnboard', function(e) {
    setHashPath("/demos/demo-onboard");
  });
  
  updateDemoList();
}

// update the Demo Form page
function updateDemoFormPage(title, demoId) {
  let name = "", 
      contact = "",
      description = "",
      repository_url = "",
      deploy_url = "",
      undeploy_url = "";
  let demoJson = demoDict[demoId];
  if (demoJson) {
    name = demoJson["name"];
    contact = demoJson["contact"];
    description = demoJson["description"];
    repository_url = demoJson["repository_url"];
    deploy_url = demoJson["deploy_url"];
    undeploy_url = demoJson["undeploy_url"];
  }
  select('#mainContent').innerHTML = 
    `<div class="row">
      <div class="col-lg-3"></div>
      <div class="col-lg-6">
        <div class="accordion mb-3" id="accordion">
          <div class="accordion-item">
            <h3 class="accordion-header" id="headingOne">
              <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne"> 
                ${title}
              </button>
            </h3>
            <div id="collapseOne" class="accordion-collapse collapse show" aria-labelledby="headingOne" data-bs-parent="#accordion">
              <div class="accordion-body"> 
                <form id="frmDemoInfo" name="frmDemoInfo" class="row g-3 needs-validation" novalidate="">          
                  <div class="col-12"> 
                    <label for="inputName" class="form-label">Name / Title:</label>
                    <input id="inputName" name="name" value="${name}" type="text" class="form-control" required="">
                    <div class="invalid-feedback">Please provide a name / title.</div>
                  </div>
                  <div class="col-12"> 
                    <label for="inputContact" class="form-label">Contacts:</label>
                    <input id="inputContact" name="contact" value="${contact}" type="text" class="form-control" placeholder="alias@google.com, alias" required="">
                    <div class="invalid-feedback">Please provide alias or email separated by comma.</div>
                  </div>
                  <div class="col-12"> 
                    <label for="inputDescription" class="form-label">Description:</label>
                    <textarea id="inputDescription" name="description" class="form-control" required="">${description}</textarea>
                    <div class="invalid-feedback">Please provide a description.</div>
                  </div>
                  <div class="col-12"> 
                    <label for="inputRepoUrl" class="form-label">Github Repo URL:</label>
                    <input id="inputRepoUrl" name="repository_url" value="${repository_url}" type="text" class="form-control" required="">
                    <div class="invalid-feedback">Please provide the Github repository URL.</div>
                  </div>
                  <div class="col-12"> 
                    <label for="inputDeployUrl" class="form-label">Deploy Script URL:</label>
                    <input id="inputDeployUrl" name="deploy_url" value="${deploy_url}" type="text" class="form-control" required="">
                    <div class="invalid-feedback">Please provide the deploy script URL.</div>
                  </div>
                  <div class="col-12"> 
                    <label for="inputUndeployUrl" class="form-label">Undeploy Script URL:</label>
                    <input id="inputUndeployUrl" name="undeploy_url" value="${undeploy_url}" type="text" class="form-control" placeholder="Nice to have">
                    <div class="invalid-feedback">Please provide the deploy script URL.</div>
                  </div>
                  <div class="text-center"> 
                    <button class="btn btn-outline-primary btn-sm me-3" type="submit">Save Demo</button>
                    <button type="reset" class="btn btn-outline-secondary btn-sm">Reset</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3"></div>
    </div>`;

  // form validation and submission
  var form = select('#frmDemoInfo');
  form.addEventListener('submit', function(event) {
    event.preventDefault();
    event.stopPropagation();
    if (form.checkValidity()) {
      var jsonObj = formData2JSON(form);
      var uuid = generateUUID();
      jsonObj["id"] = uuid;
      console.log(JSON.stringify(jsonObj));

      demoList.push(jsonObj);
      demoDict[uuid] = jsonObj;
      setHashPath("/demos/demo-list");
      
      // select('#collapseOne').classList.remove('show');
      // select('.accordion-button').classList.remove('collapsed');
    } 
    form.classList.add('was-validated')
  }, false);

  form.addEventListener('reset', function(event) {
    form.classList.remove('was-validated')
  }, false);
}

// update main content
function updateMainContent(hashPath) {
  let paths = hashPath.split("/");
  let path = paths[paths.length-1]

  switch (path) {
    case "demo-list":
      updateDemoListPage();
      break;
    case "demo-onboard":
      updateDemoFormPage("Demo Onboard Form");
      break;
    case "demo-update":
      updateDemoFormPage("Demo Update Form");
      break;
    default: 
      select('#mainContent').innerHTML = `<h1>${BREADCRUMB_LABELS[path]}</h1>`;
  }
}

// show/hide the veil 
function toggleVeil(shown) {
  var veil = document.getElementById("veil");
  veil.style.display = shown ? "block" : "none";
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
      method: "POST",
      body: JSON.stringify({demoId: "test123"})
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

// route based updates
function onHashPathChanged() {
  let hashPath = getHashPath();
  if (hashPath === "") {
    setHashPath("/dashboard");
  } else {
    prevHashPath = curHashPath;
    curHashPath = hashPath;
    updateSidebarSelected();
    updateBreadcrumb(hashPath);
    updateMainContent(hashPath);
    // deploy(hashPath);
  }
}

// popup window callback
window.onload = function() {
  if (window.opener != null && !window.opener.closed) {
      window.opener.setHashPath(location.href.split("#")[1]);
      window.opener.toggleVeil(false);
      window.close();
  } else {
      console.log("onload: " + location.hash);
      onHashPathChanged();
  }
}

// parent window - trigger on hashchange
window.onhashchange = function() {
  console.log("onhashchange: " + location.hash);
  onHashPathChanged();

  /*
  prevHashPath = curHashPath;
  curHashPath = getHashPath();
  updateSidebarSelected();
  updateBreadcrumb(curHashPath);
  updateMainContent(curHashPath);
  */
  // deploy(hashPath);
}
