$(document).ready(function () {

  if(window.location.hash) {
    var room = window.location.hash.split('#')[1];
  } else {
    var room = Math.floor(Math.random() * 1000000000000000);
    window.location.hash = '#' + room;
  }

  var pixSize = 1, lastPoint = null, currentColor = "000", mouseDown = 0;

  var pixelDataRef = new Firebase('https://justdrawit.firebaseio.com/' + room);

  var myCanvas = document.getElementById('drawing-canvas');
  var myContext = myCanvas.getContext ? myCanvas.getContext('2d') : null;
  if (myContext == null) {
    alert("You must use a browser that supports HTML5 Canvas to run this demo.");
    return;
  }

  var colors = ["1abc9c","2ecc71","3498db","9b59b6","f1c40f","e67e22","e74c3c","ecf0f1","95a5a6","34495e"];
  for (c in colors) {
    var item = $('<div/>').css("background-color", '#' + colors[c]).addClass("colorbox");
    item.click((function () {
      var col = colors[c];
      return function () {
        currentColor = col;
      };
    })());
    item.appendTo('#colorholder');
  }

  myCanvas.onmousedown = function () {mouseDown = 1;};
  myCanvas.onmouseout = myCanvas.onmouseup = function () {
    mouseDown = 0; lastPoint = null;
  };

  var drawLineOnMouseMove = function(e) {
    if (!mouseDown) return;

    e.preventDefault();
    var offset = $('canvas').offset();
    var x1 = Math.floor((e.pageX - offset.left) / pixSize - 1),
      y1 = Math.floor((e.pageY - offset.top) / pixSize - 1);
    var x0 = (lastPoint == null) ? x1 : lastPoint[0];
    var y0 = (lastPoint == null) ? y1 : lastPoint[1];
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    var sx = (x0 < x1) ? 1 : -1, sy = (y0 < y1) ? 1 : -1, err = dx - dy;
    while (true) {

      pixelDataRef.child(x0 + ":" + y0).set(currentColor === "fff" ? null : currentColor);

      if (x0 == x1 && y0 == y1) break;
      var e2 = 2 * err;
      if (e2 > -dy) {
        err = err - dy;
        x0 = x0 + sx;
      }
      if (e2 < dx) {
        err = err + dx;
        y0 = y0 + sy;
      }
    }

    lastPoint = [x1, y1];
  };
  $(myCanvas).mousemove(drawLineOnMouseMove);
  $(myCanvas).mousedown(drawLineOnMouseMove);

  var drawPixel = function(snapshot) {
    var coords = snapshot.name().split(":");
    myContext.fillStyle = "#" + snapshot.val();
    myContext.fillRect(parseInt(coords[0]) * pixSize, parseInt(coords[1]) * pixSize, pixSize, pixSize);
  };
  var clearPixel = function(snapshot) {
    var coords = snapshot.name().split(":");
    myContext.clearRect(parseInt(coords[0]) * pixSize, parseInt(coords[1]) * pixSize, pixSize, pixSize);
  };
  pixelDataRef.on('child_added', drawPixel);
  pixelDataRef.on('child_changed', drawPixel);
  pixelDataRef.on('child_removed', clearPixel);

  if (localStorage) {
    if (localStorage['my_name'] === undefined) {
      var my_name = prompt("Your name?", "Guest"),
          currentStatus = "★ online";
      localStorage['my_name'] = my_name;
    } else {
      var my_name = localStorage['my_name'],
          currentStatus = "★ online";
    }
  } else {
    var my_name = prompt("Your name?", "Guest"),
        currentStatus = "★ online";
  }

  var userListRef = new Firebase("https://justdrawit.firebaseio.com/" + room + '/presences');

  var myUserRef = userListRef.push();

  var connectedRef = new Firebase("http://presence.firebaseio-demo.com/.info/connected");
  connectedRef.on("value", function(isOnline) {
    if (isOnline.val()) {
      myUserRef.onDisconnect().remove();
      setUserStatus("en ligne");
    } else {
      setUserStatus(currentStatus);
    }
  });

  function setUserStatus(status) {
    currentStatus = status;
    myUserRef.set({ name: my_name, status: status });
  }

  function getMessageId(snapshot) {
    return snapshot.name().replace(/[^a-z0-9\-\_]/gi,'');
  }

  userListRef.on("child_added", function(snapshot) {
    var user = snapshot.val();

    $("<div/>")
      .attr("id", getMessageId(snapshot))
      .text(user.name + " est " + user.status)
      .appendTo("#presenceDiv");
  });

  userListRef.on("child_removed", function(snapshot) {
    $("#presenceDiv").children("#" + getMessageId(snapshot))
      .remove();
  });

  userListRef.on("child_changed", function(snapshot) {
    var user = snapshot.val();
    $("#presenceDiv").children("#" + getMessageId(snapshot))
      .text(user.name + " est " + user.status);
  });

  document.onIdle = function () {
    setUserStatus("absent");
  }
  document.onAway = function () {
    setUserStatus("inactif");
  }
  document.onBack = function (isIdle, isAway) {
    setUserStatus("en ligne");
  }

  setIdleTimeout(5000);
  setAwayTimeout(10000);

  // CHAT

  var messagesRef = new Firebase('https://justdrawit.firebaseio.com/' + room + '/messages');

  $('#messageInput').keypress(function (e) {
    if (e.keyCode == 13) {
      var name = my_name;
      var text = $('#messageInput').val();
      messagesRef.push({name:name, text:text});
      $('#messageInput').val('');
    }
  });

  messagesRef.limit(10).on('child_added', function (snapshot) {
    var message = snapshot.val();
    $('<div/>').text(message.text).prepend($('<em/>')
      .text(message.name+': ')).appendTo($('#messagesDiv'));
    $('#messagesDiv')[0].scrollTop = $('#messagesDiv')[0].scrollHeight;
  });
});
