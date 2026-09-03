const storyTree = {
  "intro": {
    "title": "INTRODUCTION",
    "src": "assets/intro.mp4",
    "next": "node1",
    "choices": []
  },
  "node1": {
    "title": "The Gate of Blossoms",
    "src": "assets/node_1.mp4",
    "overlay": "Take The Blade From Kurogane",
    "choices": [
      { "text": "Shadow Path through Inner Shrine", "target": "node2" },
      { "text": "Cross the Torch-lit Bridge", "target": "node3" }
    ]
  },
  "node2": {
    "title": "Infiltration via Shadows",
    "src": "assets/c1_n1.mp4",
    "choices": [
      { "text": "Silent Assassination", "target": "node4" },
      { "text": "Flash Powder Diversion", "target": "node5" }
    ]
  },
  "node3": {
    "title": "The Guardian Duel",
    "src": "assets/c2_n1.mp4",
    "choices": [
      { "text": "Iaijutsu Quick-Draw Strike", "target": "node6" },
      { "text": "Defensive Posture Parry", "target": "node7" }
    ]
  },
  "node4": {
    "title": "The Ghost of the Temple",
    "src": "assets/c1_n2.mp4",
    "next": "cutscene1",
    "choices": []
  },
  "cutscene1": {
    "title": "Ren Disappears (Win)",
    "src": "assets/c1_n4.mp4",
    "isEnding": true,
    "victory": true,
    "choices": []
  },
  "node5": {
    "title": "The Encircled Courtyard (Fail)",
    "src": "assets/c1_n3.mp4",
    "isEnding": true,
    "victory": false,
    "choices": []
  },
  "node6": {
    "title": "Master of the Fast Blade (Win)",
    "src": "assets/c2_n2.mp4",
    "isEnding": true,
    "victory": true,
    "choices": []
  },
  "node7": {
    "title": "Shattered Steel (Fail)",
    "src": "assets/c2_n3.mp4",
    "isEnding": true,
    "victory": false,
    "choices": []
  }
};

class FMVPlayer {
  constructor() {
    this.videoA = document.getElementById("video-a");
    this.videoB = document.getElementById("video-b");
    this.currentVideo = this.videoA;
    this.standbyVideo = this.videoB;

    this.choiceBox = document.getElementById("choice-container");
    this.btnWrapper = document.getElementById("buttons-wrapper");
    this.timerFill = document.getElementById("timer-fill");
    this.endScreen = document.getElementById("end-screen");
    this.endTitle = document.getElementById("end-title");
    this.endSubtitle = document.getElementById("end-subtitle");

    // Reference to the overlay text DOM element
    this.overlayText = document.getElementById("video-overlay-text");

    this.currentNode = null;
    this.choiceDisplayed = false;
    this.choiceWindowSec = 2.5;

    this.bindEvents(this.videoA);
    this.bindEvents(this.videoB);
  }

  bindEvents(video) {
    video.addEventListener("timeupdate", () => this.handleTimeUpdate(video));
    video.addEventListener("ended", () => this.handleVideoEnd(video));
  }

  start(nodeId = "intro") {
    if (this.endScreen) this.endScreen.classList.add("hidden");
    this.playNode(nodeId, true);
  }

  playNode(nodeId, immediate = false) {
    const node = storyTree[nodeId];
    if (!node) return;

    this.currentNode = node;
    this.choiceDisplayed = false;
    this.hideChoices();

    // Display or hide node overlay text
    if (this.overlayText) {
      if (node.overlay) {
        this.overlayText.textContent = node.overlay;
        this.overlayText.classList.remove("hidden");
      } else {
        this.overlayText.classList.add("hidden");
      }
    }

    const active = immediate ? this.currentVideo : this.standbyVideo;
    const inactive = immediate ? this.standbyVideo : this.currentVideo;

    // Reset playback rate back to standard speed
    active.playbackRate = 1.0;
    active.src = node.src;
    active.load();

    active.play().then(() => {
      active.classList.add("active");
      inactive.classList.remove("active");

      this.currentVideo = active;
      this.standbyVideo = inactive;

      this.preloadUpcomingBranches(node);
    }).catch(err => {
      console.warn("Autoplay muted fallback triggered:", err);
      active.muted = true;
      active.play();
    });
  }

  handleTimeUpdate(video) {
    if (video !== this.currentVideo || !this.currentNode) return;
    if (!this.currentNode.choices || this.currentNode.choices.length === 0) return;
    if (!video.duration) return;

    const remaining = video.duration - video.currentTime;

    // Trigger choices when entering the decision window
    if (remaining <= this.choiceWindowSec && !this.choiceDisplayed) {
      this.displayChoices(this.currentNode.choices);
    }

    // Progressively ramp down playback rate from 1.0 to 0.2
    if (remaining <= this.choiceWindowSec && remaining > 0.15) {
      const progress = remaining / this.choiceWindowSec;
      video.playbackRate = Math.max(0.2, 0.2 + (0.8 * progress));
    }

    // Freeze video at the end frame until player clicks an option
    if (remaining <= 0.15) {
      video.pause();
      video.currentTime = Math.max(0, video.duration - 0.05);
      video.playbackRate = 1.0;
    }
  }

  displayChoices(choices) {
    this.choiceDisplayed = true;
    this.btnWrapper.innerHTML = "";

    // Clear overlay text when choice buttons appear
    if (this.overlayText) {
      this.overlayText.classList.add("hidden");
    }

    choices.forEach(c => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = c.text;
      btn.onclick = () => {
        this.currentVideo.playbackRate = 1.0;
        this.hideChoices();
        this.playNode(c.target);
      };
      this.btnWrapper.appendChild(btn);
    });

    this.choiceBox.classList.add("active");
    if (this.timerFill) this.timerFill.style.display = "none";
  }

  hideChoices() {
    this.choiceBox.classList.remove("active");
  }

  handleVideoEnd(video) {
    if (video !== this.currentVideo) return;

    // Clear overlay on video end
    if (this.overlayText) {
      this.overlayText.classList.add("hidden");
    }

    // Do nothing if choices are active - keep awaiting player interaction
    if (this.currentNode.choices && this.currentNode.choices.length > 0) {
      video.pause();
      return;
    }

    // Automatic transition (e.g., intro to node1)
    if (this.currentNode.next) {
      this.playNode(this.currentNode.next);
      return;
    }

    // Terminal outcome
    if (this.currentNode.isEnding) {
      this.showEnding(this.currentNode);
    }
  }

  preloadUpcomingBranches(node) {
    if (node.choices && node.choices.length > 0) {
      node.choices.forEach(ch => {
        const branch = storyTree[ch.target];
        if (branch) {
          const prefetch = document.createElement("link");
          prefetch.rel = "prefetch";
          prefetch.href = branch.src;
          prefetch.as = "video";
          document.head.appendChild(prefetch);
        }
      });
    } else if (node.next) {
      const nextNode = storyTree[node.next];
      if (nextNode) {
        this.standbyVideo.src = nextNode.src;
        this.standbyVideo.load();
      }
    }
  }

  showEnding(node) {
    if (!this.endScreen) return;
    if (this.endTitle) {
      this.endTitle.textContent = node.victory ? "MISSION ACCOMPLISHED" : "FALLEN IN SHADOWS";
      this.endTitle.style.color = node.victory ? "#73d13d" : "#ff4d4f";
    }
    if (this.endSubtitle) {
      this.endSubtitle.textContent = node.title;
    }
    this.endScreen.classList.remove("hidden");
  }

  unmute() {
    this.currentVideo.muted = false;
    this.standbyVideo.muted = false;
    const banner = document.getElementById("unmute-banner");
    if (banner) banner.classList.add("hidden");
  }
}

const game = new FMVPlayer();
window.addEventListener("DOMContentLoaded", () => game.start("intro"));
