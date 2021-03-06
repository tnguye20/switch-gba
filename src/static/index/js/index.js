class Main {
  constructor() {
    this.keyDown = this.keyDown.bind(this);
    this.axisChanged = this.axisChanged.bind(this);
    this.gamepad = new Gamepad();
    this.gamepad.init();
    this.gamepad.bind(Gamepad.Event.BUTTON_DOWN, this.keyDown);
    this.gamepad.bind(Gamepad.Event.AXIS_CHANGED, this.axisChanged);

    this.isRecording = false;
    this.currentButton = null;
    this.currentGbaKey = null;

    this.onLoad();
  }

  onLoad() {
    this.keyList = document.getElementsByClassName("key-list")[0];
    this.roms = document.getElementsByClassName("rom");

    this.layout = document.getElementById("layout");
    this.layoutButton = document.getElementById("layoutButton");
    this.resetLayoutButton = document.getElementById("resetLayout");
    this.backButton = document.getElementById("backButton");

    this.layoutButton.addEventListener("click", this.toggleLayout.bind(this));
    this.resetLayoutButton.addEventListener(
      "click",
      this.resetLayout.bind(this)
    );
    this.backButton.addEventListener("click", this.goBack.bind(this));

    for (var i = 0; i < KEY_LAYOUT.length; i++) {
      var key = KEY_LAYOUT[i];
      var switchKey = key.switchKey;
      var gbaKey = key.gbaKey;

      var keyNode = document.createElement("button");
      keyNode.className = "key";
      keyNode.addEventListener("click", this.changeKey.bind(this, gbaKey));

      var gbaKeyNode = document.createElement("div");
      gbaKeyNode.className = "gba-key";
      gbaKeyNode.innerHTML = key.label;
      var switchKeyNode = document.createElement("div");
      switchKeyNode.className = "switch-key";
      switchKeyNode.innerHTML = Helper.SWITCH_KEY_LABELS[switchKey];

      keyNode.appendChild(gbaKeyNode);
      keyNode.appendChild(switchKeyNode);
      this.keyList.appendChild(keyNode);
    }

    this.roms[0].focus();
    for (var j = 0; j < this.roms.length; j++) {
      var rom = this.roms[j];
      var filename = rom.getAttribute("data-filename");
      rom.addEventListener("click", this.startRom.bind(this, filename));
    }
  }

  setRecording(recording) {
    this.isRecording = recording;
  }

  changeKey(gbaKey, event) {
    var button = event.target;
    setTimeout(this.setRecording.bind(this, true), 150);
    this.currentButton = button;
    this.currentGbaKey = gbaKey;
    var switchKey = button.getElementsByClassName("switch-key")[0];
    switchKey.innerHTML = "[Press a button]";
  }

  keyDown(event) {
    this.setKey(event.control);
  }

  axisChanged(event) {
    var key = Helper.AXIS_MAP[event.axis](event.value);
    if (!key) {
      return;
    }
    this.setKey(key);
  }

  resetLayout() {
    var confirmed = confirm("Reset all mappings?");
    if (!confirmed) {
      return;
    }

    Helper.post(
      "layout",
      {
        type: "reset"
      },
      () => {
        location.reload();
      },
      50
    );
  }

  setKey(key) {
    if (!this.isRecording) {
      return;
    }
    this.isRecording = false;

    Helper.post("layout", {
      type: "update",
      switch_key: key,
      gba_key: this.currentGbaKey
    });

    var switchKey = this.currentButton.getElementsByClassName("switch-key")[0];
    switchKey.innerHTML = Helper.SWITCH_KEY_LABELS[key];
  }

  toggleLayout() {
    var display = this.layout.style.display === "block";
    this.layout.style.display = display ? "none" : "block";
  }

  goBack() {
    var goBack = confirm("Do you want to leave?");
    if (!goBack) {
      return;
    }
    window.history.go(-(window.history.length - 1));
  }

  startRom(filename) {
    var startRom = confirm("Start " + filename + "?");
    if (!startRom) {
      return;
    }

    location.href =
      window.location.origin + "/game?game=" + encodeURIComponent(filename);
  }
}
