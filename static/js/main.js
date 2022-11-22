"use strict";

let PROJECTS_ENDPOINT = "/deploy/projects";
let REGIONS_ENDPOINT  = "/deploy/projects/<project>/regions";
let DEPLOY_ENDPOINT   = "/deploy/projects/<project>/regions/<region>/demos/<id>";
let DEMO_LIST   = "/demos"
let DEMO_GET    = "/demos/<id>"
let DEMO_CREATE = "/demos"
let DEMO_UPDATE = "/demos/<id>"
let DEMO_DELETE = "/demos/<id>"
let DEPLOYMENT_LIST = "/deployments"

let demoList = [];
let myDemoList = [];
let projectList = [];

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

// Sidebar toggle
let btnSidebarToggle = document.querySelector('.toggle-sidebar-btn');
if (btnSidebarToggle) {
  btnSidebarToggle.addEventListener('click', function(e) {
    document.body.classList.toggle('toggle-sidebar')
  });
}

// Search bar toggle
let btnSearchbarToggle = document.querySelector('.search-bar-toggle');
if (btnSearchbarToggle) {
  btnSearchbarToggle.addEventListener('click', function(event) {
    event.preventDefault();
    event.stopPropagation();
    document.querySelector('.search-bar').classList.toggle('search-bar-show');
  });
}

// Back to top button
let backtotop = document.querySelector('.back-to-top')
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
  document.addEventListener('scroll', toggleBacktotop);
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
  "demo-onboard": "Onboard Demo",
  "demo-update" : "Update Demo",
  "demo-deploy" : "Deploy Demo",
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
  document.querySelector('#breadcrumb').innerHTML = innerHTML;
}

// update the selected Nav Menu
let curHashPath, prevHashPath;
function updateSidebarSelected() {
  let selected = document.querySelector(`a[href="#${prevHashPath}"]`);
  if (selected) selected.classList.remove("active");
  selected = document.querySelector(`a[href="#${curHashPath}"]`);
  if (selected) selected.classList.add("active");
}

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
  function getButtons(demoId) {
    let email = document.querySelector('#txtUserEmail').innerHTML;
    if (email.indexOf("@google.com") > -1) {
      let buttons =
        `<button class="btn btn-outline-danger btn-sm float-end" onclick="deleteDemo('${demoId}')">Delete</button>
        <button class="btn btn-outline-success btn-sm float-end me-2" onclick="updateDemo('${demoId}')">Update</button>`;
      return buttons;  
    }
    return "";
  }
  if (demoList.length > 0) {
    let innerHTML = "", size = demoList.length;
    for (let i=0; i < size; i++) {
      innerHTML += 
        `<div class="col-lg-4">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">${demoList[i].name}</h5>
              <span>${demoList[i].description}</span>
            </div>
            <div class="card-footer text-end">
              <button class="btn btn-outline-primary btn-sm float-start" onclick="deployDemo('${demoList[i].id}')"><i class="bi bi-cloud-arrow-up-fill me-1"></i>Deploy</button>
              ${getButtons(demoList[i].id)}
            </div>
          </div>
        </div>`;
    }
    document.querySelector('#demoListInfo').innerHTML = "";
    document.querySelector('#demoList').innerHTML = innerHTML;
  } else {
    document.querySelector('#demoListInfo').innerHTML = 
    `<div class="alert alert-info alert-dismissible fade show" role="alert">
      <i class="bi bi-info-circle me-1"></i> No demos available to show.
    </div>`;
    document.querySelector('#demoList').innerHTML = "";
  }
}

// show the demo list page
function showDemoListPage() {
  function getOnboardButton() {
    let email = document.querySelector('#txtUserEmail').innerHTML;
    if (email.indexOf("@google.com") > -1) {
      let button = `<button id="btnOnboard" class="btn btn-outline-primary btn-sm" onclick="setHashPath('/demos/demo-onboard')"><i class="bi bi-box-arrow-in-right me-1"></i>Onboard Demo</button>`;
      return button;
    }
    return "";
  }
  document.querySelector('#mainContent').innerHTML = 
    `<div class="row mb-3">
      <div id="demoListInfo" class="col-6"></div>
      <div class="col-6 text-end">
        ${getOnboardButton()}
      </div>
    </div>
    <div id="demoList" class="row"></div>`;

  // fetch the demo list if empty
  if (demoList.length === 0) {
    makeAjaxRequest(
      DEMO_LIST, 
      null, 
      function(result) {
        demoList = result["demos"];
        showDemoList();
      }
    );
  } else {
    showDemoList();
  }
}

// show the Demo Form page
function showDemoFormPage(title, demoId) {
  let demo = {
    id: "",
    name: "", 
    contact: "",
    description: "",
    repository_url: "",
    deploy_url: "",
    undeploy_url: ""
  };
  if (demoId) { // update demo
    demo = getDemoById(demoId);
    if (demo) { // local cache
      showDemoForm(title, demo);
    } else {    // page reload
      let endpoint = DEMO_GET.replace("<id>", demoId);
      makeAjaxRequest(endpoint, {
        method: "GET"
      }, function(result){
        showDemoForm(title, result);
      });
    }
  } else { // new demo
    showDemoForm(title, demo);
  }
}

// show the demo form
function showDemoForm(title, demo) {
  document.querySelector('#mainContent').innerHTML = 
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
                  <input name="id" value="${demo["id"]}" type="hidden">
                  <div class="col-12"> 
                    <label for="inputName" class="form-label">Demo Name / Title:</label>
                    <input id="inputName" name="name" value="${demo["name"]}" type="text" class="form-control" required="">
                    <div class="invalid-feedback">Please provide a name / title.</div>
                  </div>
                  <div class="col-12"> 
                    <label for="inputContact" class="form-label">Demo Owner Aliases:</label>
                    <input id="inputContact" name="contact" value="${demo["contact"]}" type="text" class="form-control" placeholder="alias@google.com, alias" required="">
                    <div class="invalid-feedback">Please provide alias or email separated by comma.</div>
                  </div>
                  <div class="col-12"> 
                    <label for="inputDescription" class="form-label">Description:</label>
                    <textarea id="inputDescription" name="description" class="form-control" required="">${demo["description"]}</textarea>
                    <div class="invalid-feedback">Please provide a description.</div>
                  </div>
                  <div class="col-12"> 
                    <label for="inputRepoUrl" class="form-label">Github Repo URL:</label>
                    <input id="inputRepoUrl" name="repository_url" value="${demo["repository_url"]}" type="text" class="form-control" required="">
                    <div class="invalid-feedback">Please provide the Github repository URL.</div>
                  </div>
                  <div class="col-12"> 
                    <label for="inputDeployUrl" class="form-label">Deploy Script URL:</label>
                    <input id="inputDeployUrl" name="deploy_url" value="${demo["deploy_url"]}" type="text" class="form-control" required="">
                    <div class="invalid-feedback">Please provide the deploy script URL.</div>
                  </div>
                  <div class="col-12"> 
                    <label for="inputUndeployUrl" class="form-label">Undeploy Script URL:</label>
                    <input id="inputUndeployUrl" name="undeploy_url" value="${demo["undeploy_url"]}" type="text" class="form-control" placeholder="Nice to have">
                    <div class="invalid-feedback">Please provide the deploy script URL.</div>
                  </div>
                  <div class="text-center"> 
                    <button class="btn btn-outline-primary btn-sm me-3" type="submit">Save Demo</button>
                    <button class="btn btn-outline-secondary btn-sm" type="reset">Cancel</button>
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
  var form = document.querySelector('#frmDemoInfo');
  form.addEventListener('submit', function(event) {
    event.preventDefault();
    event.stopPropagation();
    if (form.checkValidity()) {
      var demo = formData2JSON(form);
      if (demo["id"] === "") { // new demo
        demo["id"] = generateUUID();
        makeAjaxRequest(DEMO_CREATE, {
          method: "POST",
          body: JSON.stringify(demo)
        }, function(result){
          demoList.push(demo);
          setHashPath("/demos/demo-list");
          let html = `<b>${new Date().toLocaleString()}</b>: The demo - ${demo.name} has been created successfully.`;
          addNotification(html, false);
        });
      } else {  // update demo
        let endpoint = DEMO_UPDATE.replace("<id>", demo["id"]);
        makeAjaxRequest(endpoint, {
          method: "PUT",
          body: JSON.stringify(demo)
        }, function(result){
          updateDemoList(demo);
          setHashPath("/demos/demo-list");
          let html = `<b>${new Date().toLocaleString()}</b>: The demo - ${demo.name} has been updated successfully.`;
          addNotification(html, false);
        });
      }
      console.log(JSON.stringify(demo));
    } 
    form.classList.add('was-validated')
  }, false);

  form.addEventListener('reset', function(event) {
    form.classList.remove('was-validated');
    setHashPath('/demos/demo-list');
  }, false);
}

// show the Demo deployment page
function showDemoDeployPage(title, demoId) {
  let name = "";
  let demo = getDemoById(demoId);
  if (demo) name = demo["name"];
  document.querySelector('#mainContent').innerHTML = 
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
                    <button class="btn btn-outline-secondary btn-sm" type="reset">Cancel</button>
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

  // fetch the demo name for page reload
  if (name === "") {
    let endpoint = DEMO_GET.replace("<id>", demoId);
    makeAjaxRequest(endpoint, {
      method: "GET"
    }, function(result){
      document.querySelector('#inputName').innerHTML = result["name"];
    });
  }

  // form validation and submission
  var form = document.querySelector('#frmDemoDeploy');
  form.addEventListener('submit', function(event) {
    event.preventDefault();
    event.stopPropagation();
    if (form.checkValidity()) {
      var demo = formData2JSON(form);
      console.log(JSON.stringify(demo));
      deploy(demo);
    } 
    form.classList.add('was-validated');
  }, false);

  form.addEventListener('reset', function(event) {
    form.classList.remove('was-validated');
    setHashPath('/demos/demo-list');
  }, false);
}

// update MyDemoList
function updateMyDemoList(demo, deploy_id, logUrl, tmstamp){
  let found = false;
  let deployment = {
    id: deploy_id,
    project_id: demo["project_id"],
    region: demo["region"],
    log_url: logUrl,
    status: "DEPLOYED",
    deployed_at: tmstamp
  };
  for (let i=0; i < myDemoList.length; i++) {
    if (myDemoList[i]["demo_id"] == demo["demo_id"]) {
      found = true;
      myDemoList[i]["deployments"].push(deployment);
    }
  } 
  if (!found) {
    let demo2 = getDemoById(demo["demo_id"]); 
    myDemoList.push({
      demo_id: demo["demo_id"],
      name: demo2["name"],
      description: demo2["description"],
      undeploy_url: demo2["undeploy_url"],
      deployments: [deployment]
    })
  }
}

// show the My Demo list content
function showMyDemoList() {
  function getButtons(myDemo) {
    if (myDemo["undeploy_url"] && myDemo["undeploy_url"].trim() !== "") {
      let buttons = `<button class="btn btn-outline-danger btn-sm float-end" onclick="undeployDemo('${myDemo["demo_id"]}')">Undeploy</button>`;
      return buttons;  
    }
    return "";
  }
  function getDeployments(myDemo) {
    let html = "", size = myDemo.deployments.length;
    for (let i=0; i < size; i++) {
      let deployment = myDemo.deployments[i];
      html += `<span>${deployment["status"]=="DEPLOYED" ? "Deployed in" : "Undeployed from"} Project: ${deployment["project_id"]} and Region: ${deployment["region"]} at ${deployment["deployed_at"]}. <a target="_blank" href="${deployment["log_url"]}">Log and status</a></span>`;
      if (i !== size - 1) html += "<hr/>";
    }
    return html;
  }
  if (myDemoList.length > 0) {
    let innerHTML = "", size = myDemoList.length;
    for (let i=0; i < size; i++) {
      let myDemo = myDemoList[i];
      innerHTML += 
        `<div class="col-lg-4">
          <div class="card">
            <div class="card-header">
              ${myDemo.name}
              ${getButtons(myDemo)}
            </div>
            <div class="card-body">
              <span>${myDemo.description}</span>
            </div>
            <div class="card-footer text-start">
              ${getDeployments(myDemo)}
            </div>
          </div>
        </div>`;
    }
    document.querySelector('#myDemoList').innerHTML = innerHTML;
  } else {
    document.querySelector('#myDemoList').innerHTML = 
    `<div id="demoListInfo" class="col-6"><div class="alert alert-info alert-dismissible fade show" role="alert">
      <i class="bi bi-info-circle me-1"></i> No deployed demos available to show.
    </div></div>`;
  }
}

// show My Demos page
function showMyDemosPage() {
  document.querySelector('#mainContent').innerHTML = `<div id="myDemoList" class="row"></div>`;

  // fetch the deployment list if empty
  if (myDemoList.length === 0) {
    makeAjaxRequest(
      DEPLOYMENT_LIST, 
      null, 
      function(result) {
        myDemoList = result["demos"];
        showMyDemoList();
      }
    );
  } else {
    showMyDemoList();
  }
}

// show main content
function updateMainContent(hashPath) {
  let paths = hashPath.split("/");
  let path = paths[paths.length-1];
  if (hashPath.indexOf("demo-list") > -1) {
    showDemoListPage();
  } 
  else if (hashPath.indexOf("my-demos") > -1) {
    showMyDemosPage();
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
      document.querySelector('#mainContent').innerHTML = `<h2>${BREADCRUMB_LABELS[path]}</h2>`;
    }
    else {
      document.querySelector('#mainContent').innerHTML = 
        `<div class="col-6 alert alert-danger alert-dismissible fade show" role="alert">
          <i class="bi bi-exclamation-octagon me-1"></i> 404 - Resource not found.
        </div>`;
    }
  }
}

// helper for making Ajax Request
function makeAjaxRequest(endpoint, data, callback) {
  if (data) {
    if (!data["headers"]) {
      data["headers"] = {
        'Content-Type': 'application/json'
      };
    }
  } else {
    data = {
      methd: "GET", 
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
  console.log(data);
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

// update the demo
function updateDemo(id) {
  setHashPath(`/demos/demo-update/${id}`);
}

// delete the demo 
function deleteDemo(id) {
  let demo = getDemoById(id);
  if (confirm(`Do you want to delete the demo - ${demo.name}?`)) {
    let endpoint = DEMO_DELETE.replace("<id>", id);
    makeAjaxRequest(endpoint, {
      method: "DELETE"
    }, function(result){
      demoList = demoList.filter(item => item.id !== id);
      showDemoList();
      let html = `<b>${new Date().toLocaleString()}</b>: The demo - ${demo.name} has been deleted successfully.`;
      addNotification(html, false);
    });
  }
}

// deploy the demo - set path
function deployDemo(id) {
  setHashPath(`/demos/demo-deploy/${id}`);
}

// deploy the demo - API call
function deploy(demo) {
  let endpoint = DEPLOY_ENDPOINT
    .replace("<project>", demo["project_id"])
    .replace("<region>", demo["region"])
    .replace("<id>", demo["demo_id"]);

  // deploy the demo
  let deploy_id = generateUUID();
  makeAjaxRequest(endpoint, {
    method: "POST",
    body: JSON.stringify({deploy_id: deploy_id})
  }, function(result){
    let tmstamp = (new Date()).toLocaleString('en-US', {timeZone: 'UTC'});
    let logUrl = result.metadata.build.logUrl;
    let message = `<b>${tmstamp}</b>: Your deployment is in progress. Please click <a target="_blank" href="${logUrl}">this link</a> for details.`;
    addNotification(message, false);
    updateMyDemoList(demo, deploy_id, logUrl, tmstamp);
    setHashPath("/demos/my-demos");
  });
}

// update the project list
function updateProjectList() {
  if (projectList.length === 0) {
    makeAjaxRequest(PROJECTS_ENDPOINT, {
      method: "GET"
    }, function(result){
      projectList = result.projects;
      let selProj = document.querySelector('#inputProject');
      projectList.forEach(el => {
        selProj.add(new Option(el.name, el.projectId));
      });
    });
  } else {
    let selProj = document.querySelector('#inputProject');
    projectList.forEach(el => {
      selProj.add(new Option(el.name, el.projectId));
    });
  }
}

// update the region list
function updateRegionList(project) {
  let endpoint = REGIONS_ENDPOINT.replace("<project>", project);
  makeAjaxRequest(endpoint, {
    method: "GET"
  }, function(result){
    let selProj = document.querySelector('#inputRegion');
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
  let el = document.querySelector('#notifications');
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
  document.querySelector('#notifCount').innerHTML = notifCount;
  document.querySelector('#notifSummary').innerHTML = `You have ${notifCount} notifications.`;
  document.querySelector('#notifClearAll').disabled = false;
}

// clear all notification messages
function clearAllNotifications() {
  let el = document.querySelector('#notifications');
  let children = el.children;
  for (let i=children.length-1; i >= 0; i--){
    el.removeChild(children[i])
  }
  document.querySelector('#notifClearAll').disabled = true;
  document.querySelector('#notifSummary').innerHTML = "You have no notifications.";
  document.querySelector('#notifCount').innerHTML = "";
  notifCount = 0;
  return false;
}

// show/hide the veil 
function toggleVeil(shown) {
  var veil = document.getElementById("veil");
  veil.style.display = shown ? "block" : "none";
}
