(() => {
  const IDLE_HINT_MS = 15000; // offer a hint after this long without speech
  const SPEECH_END_SILENCE_MS = 8000; // stop listening after this much silence

  let cameraStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let questions = [];
  let currentIndex = 0;
  let userAnswers = [];
  let hintShownFor = new Set();
  let idleTimer = null;
  let silenceTimer = null;
  let finalTranscript = '';
  let recognition = null;
  let mode = 'intro'; // 'intro' | 'question'

  const cont = document.getElementById('cont');
  const candidateName = cont.dataset.candidateName || 'there';
  const candidateRole = cont.dataset.candidateRole || 'Software Engineer';
  const questionCount = cont.dataset.questionCount || questions.length;

  async function requestFullscreen() {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
    } catch (_) {
      /* fullscreen is a nice-to-have, ignore rejection (e.g. user dismissed) */
    }
  }

  async function startCamera() {
    const video = document.getElementById('video');
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    video.srcObject = cameraStream;
    mediaRecorder = new MediaRecorder(cameraStream, { mimeType: 'video/webm' });
    mediaRecorder.addEventListener('dataavailable', (e) => recordedChunks.push(e.data));
    mediaRecorder.start(1000);
  }

  function startTimer() {
    let seconds = 0;
    setInterval(() => {
      seconds++;
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      document.querySelector('.hour').textContent = String(minutes).padStart(2, '0');
      document.querySelector('.minute').textContent = String(secs).padStart(2, '0');
    }, 1000);
  }

  async function fetchQuestions() {
    const res = await fetch('/get-questions');
    const data = await res.json();
    questions = data.data || [];
  }

  window.beginInterview = async function beginInterview() {
    const startBtn = document.getElementById('start-btn');
    startBtn.textContent = 'Loading…';
    startBtn.disabled = true;

    await fetchQuestions();
    await requestFullscreen();
    await startCamera();

    let countdown = 3;
    startBtn.textContent = countdown;
    const interval = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(interval);
        startBtn.style.display = 'none';
        document.querySelector('.call-wrapper').style.display = 'flex';
        document.getElementById('end-call-btn').style.display = 'inline-flex';
        startTimer();
        startInterviewerVideo();
        playIntroduction();
      } else {
        startBtn.textContent = countdown;
      }
    }, 1000);
  };

  let aiSpeaking = false;

  function setMicIndicator(who, active) {
    document.getElementById(who === 'you' ? 'mic-you' : 'mic-ai').style.display = active ? 'flex' : 'none';
    if (who === 'ai') {
      aiSpeaking = active;
      if (active) playInterviewerVideo();
      else pauseInterviewerVideo();
    }
  }

  // The clip opens and closes on a plain black frame, so we never show either
  // end: playback always starts a little past the opening black frame, and
  // every loop iteration is rewound early to skip the closing black frame.
  // While idle/listening we simply freeze on whatever face frame was last
  // showing instead of jumping back to a black frame.
  const LOOP_SAFETY_MARGIN = 0.15; // seconds trimmed off the tail to skip the black frame
  const IDLE_START_FRAME = 0.35; // seconds skipped at the head to skip the black frame

  function startInterviewerVideo() {
    const intVideo = document.getElementById('int_vid');
    intVideo.loop = false;

    const seekToIdleFrame = () => {
      intVideo.pause();
      intVideo.currentTime = IDLE_START_FRAME;
    };

    if (intVideo.readyState >= 1) {
      seekToIdleFrame();
    } else {
      intVideo.addEventListener('loadedmetadata', seekToIdleFrame, { once: true });
    }

    intVideo.addEventListener('timeupdate', () => {
      if (intVideo.duration && intVideo.currentTime >= intVideo.duration - LOOP_SAFETY_MARGIN) {
        intVideo.currentTime = IDLE_START_FRAME;
        if (!intVideo.paused) intVideo.play().catch(() => {});
      }
    });

    // Fallback in case the browser reaches the true end before the
    // timeupdate rewind above fires (short clip / low-frequency timeupdate) —
    // without this the clip would just stop dead instead of continuing to
    // loop for as long as the AI is still talking.
    intVideo.addEventListener('ended', () => {
      if (aiSpeaking) {
        intVideo.currentTime = IDLE_START_FRAME;
        intVideo.play().catch(() => {});
      }
    });
  }

  function playInterviewerVideo() {
    const intVideo = document.getElementById('int_vid');
    if (!intVideo.paused) return;
    // If it's sitting right at the very start (never played, or just froze
    // there), nudge past the opening black frame before playing.
    if (intVideo.currentTime < IDLE_START_FRAME) intVideo.currentTime = IDLE_START_FRAME;
    intVideo.play().catch(() => {});
  }

  function pauseInterviewerVideo() {
    const intVideo = document.getElementById('int_vid');
    // Freeze on the current (face) frame rather than jumping anywhere —
    // jumping to 0 or the end is what showed the black frame before.
    intVideo.pause();
  }

  function addChatMessage(role, text) {
    const messages = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    const who = role === 'user' ? 'You' : role === 'hint' ? 'Hint' : 'AI Interviewer';
    bubble.innerHTML = `<span class="who">${who}</span>${text}`;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function playIntroduction() {
    mode = 'greeting';
    const intro = `Hi ${candidateName}, welcome to PrepSpar. I'll be your AI interviewer today. Before we dive in, could you please introduce yourself briefly?`;

    setMicIndicator('ai', true);
    setMicIndicator('you', false);
    addChatMessage('ai', intro);

    speak(intro, () => {
      setMicIndicator('ai', false);
      startListening();
    });
  }

  function askQuestion(index) {
    mode = 'question';
    currentIndex = index;
    finalTranscript = '';
    document.getElementById('status-text').textContent = '';

    const text = questions[index];
    setMicIndicator('ai', true);
    setMicIndicator('you', false);
    addChatMessage('ai', `Question ${index + 1} of ${questions.length}: ${text}`);
    document.getElementById('hint-btn').style.display = 'inline-flex';

    speak(text, () => {
      setMicIndicator('ai', false);
      startListening();
      startIdleHintTimer();
    });
  }

  function speak(text, onEnd) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = onEnd;
    speechSynthesis.speak(utterance);
  }

  function startIdleHintTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!hintShownFor.has(currentIndex)) {
        requestHint(true);
      }
    }, IDLE_HINT_MS);
  }

  window.requestHint = async function requestHint(auto = false) {
    hintShownFor.add(currentIndex);
    document.getElementById('status-text').textContent = auto ? 'You seem stuck — here\'s a hint…' : 'Getting a hint…';
    try {
      const res = await fetch('/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIndex: currentIndex, partialAnswer: finalTranscript }),
      });
      const data = await res.json();
      document.getElementById('status-text').textContent = '';
      addChatMessage('hint', data.hint);

      setMicIndicator('ai', true);
      speak(data.hint, () => setMicIndicator('ai', false));
    } catch (err) {
      document.getElementById('status-text').textContent = '';
    }
  };

  function startListening() {
    if (!('webkitSpeechRecognition' in window)) {
      document.getElementById('status-text').textContent = 'Speech recognition is not supported in this browser.';
      return;
    }
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setMicIndicator('you', true);
      resetSilenceTimer();
    };

    recognition.onresult = (event) => {
      clearTimeout(idleTimer);
      resetSilenceTimer();
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
    };

    recognition.onerror = () => setMicIndicator('you', false);

    recognition.onend = () => {
      setMicIndicator('you', false);
      clearTimeout(silenceTimer);

      if (mode === 'greeting') {
        const introText = finalTranscript.trim() || `Thanks for having me, I'm ${candidateName}.`;
        addChatMessage('user', introText);
        const ack = `Nice to meet you, ${candidateName}! I've prepared ${questionCount} questions tailored to a ${candidateRole} role. If you get stuck, just click "Need a hint?" and I'll nudge you in the right direction. Let's get started.`;
        setMicIndicator('ai', true);
        addChatMessage('ai', ack);
        speak(ack, () => {
          setMicIndicator('ai', false);
          askQuestion(0);
        });
        return;
      }

      userAnswers[currentIndex] = finalTranscript.trim();
      addChatMessage('user', finalTranscript.trim() || '(no response captured)');

      if (currentIndex + 1 >= questions.length) {
        finishInterview();
      } else {
        setTimeout(() => askQuestion(currentIndex + 1), 1200);
      }
    };

    recognition.start();
  }

  function resetSilenceTimer() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      if (recognition) recognition.stop();
    }, SPEECH_END_SILENCE_MS);
  }

  function finishInterview() {
    document.querySelector('.call-wrapper').style.display = 'none';
    document.getElementById('end-call-btn').style.display = 'none';
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
    document.getElementById('download-card').style.display = 'block';
  }

  function stopEverything() {
    speechSynthesis.cancel();
    if (recognition) {
      try { recognition.onend = null; recognition.stop(); } catch (_) {}
    }
    clearTimeout(idleTimer);
    clearTimeout(silenceTimer);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
  }

  window.confirmEndCall = function confirmEndCall() {
    if (typeof showConfirm === 'function') {
      showConfirm({
        title: 'End Interview?',
        message: 'Are you sure you want to leave? Your progress will be lost.',
        confirmLabel: 'End Call',
        onConfirm: () => {
          stopEverything();
          window.location.href = '/';
        },
      });
    } else if (window.confirm('Are you sure you want to end the interview?')) {
      stopEverything();
      window.location.href = '/';
    }
  };

  window.downloadRecording = function downloadRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'prepspar-interview.webm';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    proceedToResults();
  };

  window.proceedToResults = function proceedToResults() {
    document.getElementById('download-card').style.display = 'none';
    document.getElementById('wait-card').style.display = 'block';

    fetch('/submit-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ans_arr: userAnswers }),
    }).finally(() => {
      window.location.href = '/result';
    });
  };
})();
