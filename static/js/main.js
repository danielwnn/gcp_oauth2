"use strict";

let PROJECTS_ENDPOINT = "/deploy/projects";
let REGIONS_ENDPOINT  = "/deploy/projects/<project>/regions";
let DEPLOY_ENDPOINT   = "/deploy/projects/<project>/regions/<region>/demos/<id>";

// Public Domain / MIT
function generateUUID() { 
  var d = new Date().getTime();
  // Time in microseconds since page-load or 0 if unsupported
  var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16; // random number between 0 and 16
      if(d > 0){ // Use timestamp until depleted
          r = (d + r)%16 | 0;
          d = Math.floor(d/16);
      } else { // Use microseconds since page-load if supported
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
      // deploy(path);
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
  "demo-deploy" : "Demo Deployment",
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
      if (BREADCRUMB_LABELS[paths[i]]) {
        innerHTML += `<li class="breadcrumb-item active">${BREADCRUMB_LABELS[paths[i]]}</li>`;
      }
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

// the demo list
let demoList = [];

// Get the demo by ID
function getDemoById(id) {
  for (let i=0; i < demoList.length; i++) {
    let item = demoList[i];
    if (id === item.id) return item;
  }
  return null;
}

// Update the demo list if found
function updateDemoList(demo) {
  for (let i=0; i < demoList.length; i++) {
    let item = demoList[i];
    if (demo.id === item.id) {
      demoList[i] = demo;
    }
  }
}

// show the demo list content
function showDemoList() {
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
              <button class="btn btn-outline-primary btn-sm float-start" onclick="deployDemo('${demoList[i].id}')"><i class="bi bi-cloud-arrow-up-fill me-1"></i>Deploy</button>
              <button class="btn btn-outline-danger btn-sm float-end" onclick="deleteDemo('${demoList[i].id}')">Delete</button>
              <button class="btn btn-outline-success btn-sm float-end me-2" onclick="updateDemo('${demoList[i].id}')">Update</button>
            </div>
          </div>
        </div>`;
    }
    select('#demoListInfo').innerHTML = "";
    select('#demoList').innerHTML = innerHTML;
  } else {
    select('#demoListInfo').innerHTML = 
    `<div class="alert alert-info alert-dismissible fade show" role="alert">
      <i class="bi bi-info-circle me-1"></i> No demos available to show.
    </div>`;
    select('#demoList').innerHTML = "";
  }
}

// show the demo list page
function showDemoListPage() {
  select('#mainContent').innerHTML = 
    `<div class="row">
      <div id="demoListInfo" class="col-6 mb-3"></div>
      <div class="col-6 text-end mb-3">
        <button id="btnOnboard" class="btn btn-outline-primary btn-sm">
          <i class="bi bi-box-arrow-in-right me-1"></i>Onboard Demo
        </button>
      </div>
    </div>
    <div id="demoList" class="row"></div>`;

  on('click', '#btnOnboard', function(e) {
    setHashPath("/demos/demo-onboard");
  });
  
  showDemoList();
}

// show the Demo Form page
function showDemoFormPage(title, demoId) {
  let id = "",
      name = "", 
      contact = "",
      description = "",
      repository_url = "",
      deploy_url = "",
      undeploy_url = "";
  let demo = demoId ? getDemoById(demoId) : null;
  if (demo) {
    let demo = getDemoById(demoId);
    id = demo["id"];
    name = demo["name"];
    contact = demo["contact"];
    description = demo["description"];
    repository_url = demo["repository_url"];
    deploy_url = demo["deploy_url"];
    undeploy_url = demo["undeploy_url"];
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
                <form id="frmDemoInfo" name="frmDemoInfo" class="row g-3 needs-validation" novalidate="" onsubmit="return false;">  
                  <input name="id" value="${id}" type="hidden">
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
                    <button class="btn btn-outline-secondary btn-sm" onclick="setHashPath('/demos/demo-list')">Cancel</button>
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
      if (jsonObj["id"] === "") { // new demo
        var uuid = generateUUID();
        jsonObj["id"] = uuid;
        demoList.push(jsonObj);
      } else {  // update demo
        updateDemoList(jsonObj);
      }
      console.log(JSON.stringify(jsonObj));
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

// show the Demo deployment page
function showDemoDeployPage(title, demoId) {
  let demo = getDemoById(demoId);
  let name = "";
  if (demo) name = demo["name"];
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
                <form id="frmDemoDeploy" name="frmDemoDeploy" class="row g-3 needs-validation" novalidate="" onsubmit="return false;">  
                  <input name="demo_id" value="${demoId}" type="hidden">
                  <div class="col-12"> 
                    <label for="inputName" class="form-label">Demo Name:</label>
                    <div id="inputName" class="form-control">${name}</div>
                  </div>
                  <div class="col-12"> 
                    <label for="inputProject" class="form-label">GCP Project:</label>
                    <select id="inputProject" name="project_id" class="form-select" required="" onchange="updateRegionList(this.value)">
                      <option value="" disabled selected hidden>Choose a project</option>
                    </select>                    
                    <div class="invalid-feedback">Please select a project.</div>
                  </div>
                  <div class="col-12"> 
                    <label for="inputRegion" class="form-label">GCP Region:</label>
                    <select id="inputRegion" name="region" class="form-select" required="">
                      <option value="" disabled selected hidden>Choose a region</option>
                    </select>
                    <div class="invalid-feedback">Please select a region.</div>
                  </div>
                  <div class="col-12"> 
                    <input class="form-check-input" id="inputAgree" name="agree" type="checkbox" value="yes" required=""> <label class="form-check-label" for="invalidCheck"> Agree to Terms and Conditions </label>
                    <div class="invalid-feedback">You must agree before deploying.</div>
                    <div class="disclaimer form-control">
                      Google Cloud grants you a non-exclusive copyright license to use all programming code examples from which you can generate similar function tailored to your own specific needs.<br/><br/>
                      SUBJECT TO ANY STATUTORY WARRANTIES WHICH CANNOT BE EXCLUDED, GOOGLE CLOUD, ITS PROGRAM DEVELOPERS AND SUPPLIERS MAKE NO WARRANTIES OR CONDITIONS EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OR CONDITIONS OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT, REGARDING THE PROGRAM OR TECHNICAL SUPPORT, IF ANY.<br/><br/>
                      UNDER NO CIRCUMSTANCES IS GOOGLE CLOUD, ITS PROGRAM DEVELOPERS OR SUPPLIERS LIABLE FOR ANY OF THE FOLLOWING, EVEN IF INFORMED OF THEIR POSSIBILITY:<br/><br/> 1. LOSS OF, OR DAMAGE TO, DATA;<br/>2. DIRECT, SPECIAL, INCIDENTAL, OR INDIRECT DAMAGES, OR FOR ANY ECONOMIC CONSEQUENTIAL DAMAGES; OR<br/>3. LOST PROFITS, BUSINESS, REVENUE, GOODWILL, OR ANTICIPATED SAVINGS.<br/><br/>
                      SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF DIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, SO SOME OR ALL OF THE ABOVE LIMITATIONS OR EXCLUSIONS MAY NOT APPLY TO YOU.
                    </div>
                  </div>
                  <div class="text-center"> 
                    <button class="btn btn-outline-primary btn-sm me-3" type="submit">Deploy Demo</button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="setHashPath('/demos/demo-list')">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3"></div>
    </div>`;

  // update the project list
  updateProjectList();

  // fetch the demo name from the backend
  if (name === "") {

  }

  // form validation and submission
  var form = select('#frmDemoDeploy');
  form.addEventListener('submit', function(event) {
    event.preventDefault();
    event.stopPropagation();
    if (form.checkValidity()) {
      var demo = formData2JSON(form);
      console.log(JSON.stringify(demo));

      deploy(demo);
    } 
    form.classList.add('was-validated')
  }, false);

  form.addEventListener('reset', function(event) {
    form.classList.remove('was-validated')
  }, false);
}

// show main content
function updateMainContent(hashPath) {
  let paths = hashPath.split("/");
  let path = paths[paths.length-1];
  if (hashPath.indexOf("demo-list") > -1) {
    showDemoListPage();
  } 
  else if (hashPath.indexOf("demo-onboard") > -1) {
    showDemoFormPage("Demo Onboard Form");
  } 
  else if (hashPath.indexOf("demo-update") > -1) {
    showDemoFormPage("Demo Update Form", path);
  } 
  else if (hashPath.indexOf("demo-deploy") > -1) {
    showDemoDeployPage("Demo Deployment Form", path);
  } 
  else {
    let label = BREADCRUMB_LABELS[path];
    if (label) {
      select('#mainContent').innerHTML = `<h2>${BREADCRUMB_LABELS[path]}</h2>`;
    }
    else {
      select('#mainContent').innerHTML = 
        `<div class="col-6 alert alert-danger alert-dismissible fade show" role="alert">
          <i class="bi bi-exclamation-octagon me-1"></i> 404 - Resource not found.
        </div>`;
    }
  }
}

// update the demo
function updateDemo(id) {
  setHashPath(`/demos/demo-update/${id}`);
}

// delete the demo 
function deleteDemo(id) {
  let demo = getDemoById(id);
  if (confirm(`Do you want to delete the demo - ${demo.name}?`)) {
    demoList = demoList.filter(item => item.id !== id);
    showDemoList();
  }
}

// deploy the demo - set path
function deployDemo(id) {
  setHashPath(`/demos/demo-deploy/${id}`);
}

// helper for making Ajax Request
function makeAjaxRequest(endpoint, data, callback) {
  fetch(endpoint, data)
  .then(async function(response) {
    if (response.status == 401) {
      openPopWindow("/authorize", "oauth2", 800, 600);
      toggleVeil(true);
    } else {
      var result = await response.json();
      if (response.ok) {
        callback(result);
      } else {
        addNotification(result.error.message, true);
      }
    }
  })
  .catch(error => {
    addNotification(error, true);
  });
}

// deploy the demo - API call
function deploy(demo) {
  let endpoint = DEPLOY_ENDPOINT
    .replace("<project>", demo["project_id"])
    .replace("<region>", demo["region"])
    .replace("<id>", demo["demo_id"]);

  // deploy the demo
  makeAjaxRequest(endpoint, {
    method: "POST"
  }, function(result){
    let html = `Your deployment is in progress. Please click <a target="_blank" href="${result.metadata.build.logUrl}">the link here</a> for details.`;
    addNotification(html, false);
  });
}

// update the project list
function updateProjectList() {
  makeAjaxRequest(PROJECTS_ENDPOINT, {
    method: "GET"
  }, function(result){
    let selProj = select('#inputProject');
    result.projects.forEach(el => {
      selProj.add(new Option(el.name, el.projectId));
    });
  });
}

// update the region list
function updateRegionList(project) {
  let endpoint = REGIONS_ENDPOINT
    .replace("<project>", project);

  makeAjaxRequest(endpoint, {
    method: "GET"
  }, function(result){
    let selProj = select('#inputRegion');
    result.regions.forEach(name => {
      selProj.add(new Option(name, name));
    });
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
  }
}

// popup window callback
function popupCallback(hashPath) {
  console.log("popup hash: " + hashPath);
  toggleVeil(false);

  if (hashPath.search(/\/deploy\/projects\/.+\/regions\/.+\/demos\/.+/i) > -1) { // deploy
    let matches = hashPath.match(/\/deploy\/projects\/(.+)\/regions\/(.+)\/demos\/(.+)/i);
    deploy({
      project_id: matches[1],
      region: matches[2],
      demo_id: matches[3]
    });
  } 
  else if (hashPath.search(/\/deploy\/projects\/.+\/regions/i) > -1) { // regions
    let matches = hashPath.match(/\/deploy\/projects\/(.+)\/regions/i);
    updateRegionList(matches[1]);
  } 
  else if (hashPath.search(/\/deploy\/projects/i) > -1) { // projects
    updateProjectList();
  }
}

// onload event trigger
window.onload = function() {
  console.log("onload: " + location.hash);
  onHashPathChanged();
}

// onhashchange event trigger
window.onhashchange = function() {
  console.log("onhashchange: " + location.hash);
  onHashPathChanged();
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

// the notification message count
let notifCount = 0;

// add a new notification message
function addNotification(message, isError) {
  let el = select('#notifications');
  let html = 
    `<li>
      <hr class="dropdown-divider">
    </li>
    <li class="notification-item">
      <i class="bi ${isError ? 'bi-x-circle' : 'bi-check-circle'} ${isError ? 'text-danger' : 'text-success'}"></i>
      <p>${message}</p>
    </li>`;
  el.insertAdjacentHTML("afterbegin", html);
  notifCount++;
  select('#notifCount').innerHTML = notifCount;
  select('#notifSummary').innerHTML = `You have ${notifCount} notifications.`;
  select('#notifClearAll').disabled = false;
}

// clear all notification messages
function clearAllNotifications() {
  let el = select('#notifications');
  let children = el.children;
  for (let i=children.length-1; i > 0; i--){
    el.removeChild(children[i])
  }
  select('#notifClearAll').disabled = true;
  select('#notifSummary').innerHTML = "You have no notifications.";
  select('#notifCount').innerHTML = "";
  notifCount = 0;
  return false;
}

// show/hide the veil 
function toggleVeil(shown) {
  var veil = document.getElementById("veil");
  veil.style.display = shown ? "block" : "none";
}
