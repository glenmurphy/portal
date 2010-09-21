function $(o) { return document.getElementById(o); }
function bind(fn, selfObj, var_args) {
  var boundArgs = Array.prototype.slice.call(arguments, 2);
  return function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift.apply(args, boundArgs);
    return fn.apply(selfObj, args);
  }
}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (request.method == "fromPopup") {
    // Send JSON data back to Popup.
    sendResponse({data: "from Content Script to Popup"});

    // Send JSON data to background page.
    chrome.extension.sendRequest({method: "fromContentScript"}, function(response) {
      console.log(response.data);
    });
  } else {
    sendResponse({}); // snub them.
  }
});

function Portal() {
  this.bindMD_ = bind(this.handleMousedown_, this);
  this.bindMU_ = bind(this.handleMouseup_, this);

  document.body.addEventListener('mousedown', this.bindMD_, true);
  document.body.addEventListener('mouseup', this.bindMU_, false);
  
  this.drag_ = {
    mode : null,
    obj : null,
    x : 0,
    y : 0,
  }
}

Portal.modes = {
  CREATING : 0,
  MOVING : 1,
}

Portal.prototype.createNode_ = function(x, y) {
  if (!this.node) {
    this.node = document.createElement('div');
    this.node.style.borderWidth = '1px';
    this.node.style.borderStyle = 'solid';
    this.node.style.borderColor = 'rgba(0, 0, 0, 0.5)';
    this.node.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    this.node.style.position = 'absolute';
    this.node.style.zIndex = '10000';
    //this.node.addEventListener('dblclick', bind(this.handleDblClick_, this), true);
    document.body.appendChild(this.node);
  }
  
  this.node.style.top = y + 'px';
  this.node.style.left = x + 'px';
  this.node.style.width = '0px';
  this.node.style.height = '0px';
}

Portal.prototype.handleMousedown_ = function(event) {
  this.bindMM_ = bind(this.handleMousemove_, this);
  document.body.addEventListener('mousemove', this.bindMM_, false);

  if (event.target == this.node) {
    this.drag_.mode = Portal.modes.MOVING;
    this.drag_.x = parseInt(event.pageX) - parseInt(this.node.style.left);
    this.drag_.y = parseInt(event.pageY) - parseInt(this.node.style.top);
    event.preventDefault();
  } else {
    this.createNode_(parseInt(event.pageX), parseInt(event.pageY));
    this.drag_.mode = Portal.modes.CREATING;
    this.drag_.x = parseInt(event.pageX);
    this.drag_.y = parseInt(event.pageY);
    event.preventDefault();
  }
}

Portal.prototype.handleMousemove_ = function(event) {
  if (this.drag_.mode == Portal.modes.CREATING) {
    this.node.style.left = parseInt(Math.min(this.drag_.x, event.pageX)) + 'px';
    this.node.style.top = parseInt(Math.min(this.drag_.y, event.pageY)) + 'px';
    this.node.style.width = Math.max(this.drag_.x, event.pageX) - parseInt(this.node.style.left) + 'px';
    this.node.style.height = Math.max(this.drag_.y, event.pageY) - parseInt(this.node.style.top) + 'px';
  } else if (this.drag_.mode == Portal.modes.MOVING) {
    this.node.style.left = parseInt(event.pageX) - this.drag_.x + 'px';
    this.node.style.top = parseInt(event.pageY) - this.drag_.y + 'px';
  }
}

Portal.prototype.handleMouseup_ = function(event) {
  this.drag_.mode = null;
  chrome.extension.sendRequest({
    type : "launchPortal",
    url: window.location.href,
    port_width : parseInt(this.node.style.width),
    port_height : parseInt(this.node.style.height),
    body_width : document.body.clientWidth,
    body_height : document.body.clientHeight,
    body_top : -parseInt(this.node.style.top),
    body_left : -parseInt(this.node.style.left),
  })
  document.body.removeChild(this.node);
  document.body.removeEventListener('mousedown', this.bindMD_, true);
  document.body.removeEventListener('mouseup', this.bindMU_, false);
  if (this.bindMM_)
    document.body.removeEventListener('mousemove', this.bindMM_, false);
  this = null; // ?
}

new Portal();