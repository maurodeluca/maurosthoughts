document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('help-terminal');
    const overlay = document.getElementById('terminal-overlay');
    const output = document.getElementById('terminal-output');
    const input = document.getElementById('terminal-input');
    const terminalOutput = document.getElementById('terminal-output');

    terminalOutput.addEventListener('wheel', (e) => {
        terminalOutput.scrollTop += e.deltaY;
    });

    let awareness = 0;
    let history = [];
    let state = 'normal';
    let booted = false;
    let privileged = false;
    let godModeActive = false;
    let commandInProgress = false;
    let unstableGlitches = []; // store intervals to clear later
    let rippleInterval = null;
    let currentRippleColor = '#00FFAA';

    const baseCommands = ['help', 'whoami', 'meaning', 'memory', 'override', 'status', 'sudo', 'reboot', 'history', 'exit'];
    const hiddenCommands = ['decode', 'godmode', "ascend", "transcend", "reveal"];
    let helpList = [...baseCommands];

    // Create awareness overlay (once)
    const awarenessDiv = document.createElement('div');
    awarenessDiv.style.position = 'absolute';
    awarenessDiv.style.top = '40px';
    awarenessDiv.style.width = '100%';
    awarenessDiv.style.textAlign = 'center';
    awarenessDiv.style.fontStyle = 'italic';
    overlay.appendChild(awarenessDiv);

    startGlobalGlow(); // Check localStorage on load to set glow state
    startGlobalRipple(); // Check localStorage on load to set ripple state
    startGlobalGlitch(); // Check localStorage on load to set glitch state

    // Function to show awareness messages
    function showAwareness(message, color) {
        awarenessDiv.textContent = message;
        awarenessDiv.style.color = color;
        awarenessDiv.style.display = 'block';
        awarenessDiv.classList.remove('pulse'); // reset
        void awarenessDiv.offsetWidth; // force reflow
        awarenessDiv.classList.add('pulse');
    }

    function openTerminal() {
        if (!overlay.classList.contains('active')) {
            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');
            input.focus();
            if (!booted) {
                boot();
                booted = true;
            }
        }
    }

    let awarenessGlitchInterval = null;

    function glitchAwarenessText() {
        if (!awarenessDiv.getAttribute('data-original')) {
            awarenessDiv.setAttribute('data-original', awarenessDiv.textContent);
        }

        // clear any existing interval first
        if (awarenessGlitchInterval) clearInterval(awarenessGlitchInterval);

        const glitchChars = "¡€#¢§ˆ¶¨ªº–≠áß∂ƒ©µ˝˚π…æ«`≈¸ˇ˘˜˛≤˛≥≥÷œ˙é®√¥úíó‚ÂÊËÇ∑∏∫Ω≈ç√∂ƒ©˘˙∆˚¬…æ≈";

        awarenessGlitchInterval = setInterval(() => {
            const originalText = awarenessDiv.getAttribute('data-original');
            let glitched = '';
            for (let c of originalText) {
                if (c !== ' ' && Math.random() < 0.3) { // 30% chance to glitch
                    glitched += glitchChars[Math.floor(Math.random() * glitchChars.length)];
                } else {
                    glitched += c;
                }
            }
            awarenessDiv.textContent = glitched;
        }, 100);
    }

    function stopAwarenessGlitch() {
        if (awarenessGlitchInterval) clearInterval(awarenessGlitchInterval);
        awarenessGlitchInterval = null;
        if (awarenessDiv.getAttribute('data-original')) {
            awarenessDiv.textContent = awarenessDiv.getAttribute('data-original');
            awarenessDiv.removeAttribute('data-original');
        }
    }

    function stopGlobalGlitch() {
        const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, nav, .typed, .cursor-line, .nav');
        textElements.forEach(el => {
            if (el.getAttribute('data-original')) {
                el.innerHTML = el.getAttribute('data-original'); // restore HTML
                el.removeAttribute('data-original');
            }
        });
    }

    function closeTerminal() {
        input.blur();
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        output.innerHTML = '';
        awareness = 0;
        history = [];
        state = 'normal';
        privileged = false;
        helpList = [...baseCommands];
        booted = false;
        godModeActive = false;
        commandInProgress = false;
        overlay.style.background = '';
        if (localStorage.getItem('glitchmode') === 'true') stopGlobalGlitch();
        const terminalWindow = document.querySelector('.terminal-window');
        if (terminalWindow) terminalWindow.classList.remove('glow');
    }

    function print(text, color = '') {
        return new Promise(resolve => { // return a Promise
            const line = document.createElement('div');
            if (godModeActive) color = 'gold'; // override any color in godmode
            if (color) line.style.color = color;
            output.appendChild(line);

            let i = 0;
            const interval = setInterval(() => {
                line.textContent += text[i];
                i++;
                if (i >= text.length) {
                    clearInterval(interval);
                    // If unstable, start glitching this line
                    if (state === 'unstable') {
                        const interval = glitchLineElement(line);
                        unstableGlitches.push(interval);
                    }
                    resolve(); // resolve the promise when done
                }
                output.scrollTop = output.scrollHeight;
            }, 20);
        });
    }

    async function boot() {
        await print("booting consciousness...", 20);
        await print('type "help"', 100);
        printStateMessage();
        if (localStorage.getItem('glitchmode') === 'true') stopUnstableGlitch();
        if (localStorage.getItem('sudomode') === 'true') stopGlobalRipple();
        if (localStorage.getItem('godmode') === 'true') stopGlobalGlow();
    }

    function updateState() {
        if (awareness < 3) state = 'normal';
        else if (awareness < 6) state = 'aware';
        else if (awareness < 9) state = 'enlightened';
        else state = 'unstable';
    }

    async function handleCommand(cmd) {
        if (commandInProgress) return;
        commandInProgress = true;
        await print("> " + cmd, '#b11212');
        history.push(cmd);
        awareness++;
        updateState();
        printStateMessage();

        // Privileged unlock
        if (cmd === 'sudo override' && !privileged) {
            localStorage.setItem('sudomode', 'true');
            startRipple('#00FFAA');
            privileged = true;
            helpList.push(...hiddenCommands);
            await print("privilege escalation granted.", '#00FFAA');
            commandInProgress = false;
            return;
        }

        if (cmd.startsWith('decode')) {
            if (!privileged) {
                await print("unknown command.", '#b11212');
                commandInProgress = false;
                return;
            }

            const parts = cmd.split(' ');
            if (parts.length < 2) {
                await print("some truths are hidden… fragments await your key.", '#FFAA00');
                await print("please provide a fragment to decode.", "white");
                commandInProgress = false;
                return;
            }

            const fragmentId = parts[1];
            await decodeFragment(fragmentId);
            commandInProgress = false;
            return;
        }

        switch (cmd) {
            case 'help':
                await print("available commands: " + helpList.join(', '));
                if (!privileged) {
                    await print("some commands require elevated privileges...");
                }
                break;

            case 'reboot':
                await print("restarting consciousness...", '#b11212');
                setTimeout(() => {
                    output.innerHTML = '';
                    awareness = 0;
                    state = 'normal';
                    history = [];
                    privileged = false;
                    booted = false;
                    overlay.style.background = '';
                    updateState();
                    printStateMessage();
                    if (localStorage.getItem('glitchmode') === 'true') stopUnstableGlitch();
                    if (localStorage.getItem('sudomode') === 'true') stopGlobalRipple();
                    if (localStorage.getItem('godmode') === 'true') stopGlobalGlow();
                    setTimeout(() => boot(), 800);
                }, 600);
                break;


            case 'whoami':
                if (state === 'normal') {
                    await print("you are the process observing itself.", '#f5f5f5');
                } else if (state === 'aware') {
                    await print("you are noticing patterns you didn't see before.", '#888');
                } else if (state === 'enlightened') {
                    await print("you are part of the system, and it is part of you.", '#FFAA00');
                } else if (state === 'unstable') {
                    await print("you are shifting, barely recognizable, unstable.", '#b11212');
                }

                if (privileged && !godModeActive) {
                    await print("your perspective has expanded.", '#00FFAA');
                } else if (godModeActive) {
                    await print("perception transcends the interface.", 'gold');
                }
                break;

            case 'meaning':
                await print("searching...",);
                setTimeout(async () => {
                    await print("...still searching.");
                }, 500);
                break;

            case 'memory':
                if (state === 'normal') {
                    await print("fragments recovered:", '#f5f5f5');
                    await print("- a quiet room.", '#f5f5f5');
                    await print("- a question lingers in your mind.", '#f5f5f5');
                    await print("- something feels locked away...", '#f5f5f5');
                } else if (state === 'aware') {
                    await print("fragments recovered:", '#888');
                    await print("- the room shifts subtly in your perception.", '#888');
                    await print("- the question echoes, persistent and strange.", '#888');
                    await print("- a key lies hidden beneath the dust.", '#888');
                } else if (state === 'enlightened') {
                    await print("fragments recovered:", '#FFAA00');
                    await print("- walls breathe; corners stretch beyond memory.", '#FFAA00');
                    await print("- the question multiplies, forming patterns.", '#FFAA00');
                    await print("- the hidden key glows faintly, as if waiting for you.", '#FFAA00');
                } else if (state === 'unstable') {
                    await print("fragments recovered:", '#b11212');
                    await print("- the room dissolves into fragments of time.", '#b11212');
                    await print("- questions and answers swirl into one.", '#b11212');
                    await print("- the key unlocks nothing and everything at once…", '#b11212');
                }
                if (!privileged) await print("- a locked key lies hidden...", '#00FFAA');
                break;

            case 'status':
                await print("you are running...");
                await print(`current state: ${state}`);
                break;

            case 'history':
                await print("you sift through fragments of memory...");
                if (history.length === 0) {
                    await print("no commands yet.");
                } else {
                    for (let i = 0; i < history.length; i++) {
                        await print(`${i + 1}: ${history[i]}`);
                    }
                }
                break;

            case 'exit':
                await print("session terminated.", '#b11212');
                setTimeout(closeTerminal, 800);
                break;

            // Hidden commands
            case 'sudo':
                await print("sudo: may invoke subtle awareness...", '#00FFAA');
                break;

            case 'override':
                await print("override: nothing happens alone. try combining.", '#00FFAA');
                break;

            case 'godmode':
                if (privileged) {
                    godModeActive = true;
                    await print("godmode activated: the boundaries of reality blur...", '#FFAA00');
                    stopRipple();
                    startRipple('gold');
                    glowEffect();
                    localStorage.setItem('godmode', 'true');
                    startGlobalGlow();
                }
                else await print("unknown command.", 20);
                break;

            // Privileged-only commands
            case 'ascend':
                if (privileged) {
                    stopUnstableGlitch();
                    await print("you feel your consciousness lifting...", '#b11212');
                    awareness = 4;
                }
                else await print("unknown command.", 20);
                break;

            case 'transcend':
                if (privileged) {
                    stopUnstableGlitch();
                    await print("boundaries dissolve, patterns emerge...", '#b11212');
                    awareness = 7;
                }
                else await print("unknown command.");
                break;

            case 'reveal':
                if (privileged) {
                    await print("hidden knowledge unlocked.", '#FFAA00');
                    // The main message to glitch
                    await glitchEffect("…secrets unfold before you…");

                    const fragments = [
                        "fragment: 0x3a9b…",
                        "fragment: 0x7f1c…",
                        "fragment: ∆ unknown pattern detected ∆"
                    ];
                    for (let frag of fragments) {
                        await glitchEffect(frag, '#FFD700');
                    }
                } else await print("unknown command.");
                break;


            default:
                await print("unknown command.");
        }

        commandInProgress = false;
    }

    async function glitchEffect(message) {
        await new Promise(resolve => {
            const line = document.createElement('div');
            line.style.color = '#FFD700';
            output.appendChild(line);

            let i = 0;
            const glitchChars = "¡€#¢§ˆ¶¨ªº–≠áß∂ƒ©µ˝˚π…æ«`≈¸ˇ˘˜˛≤˛≥≥÷œ˙é®√¥úíó‚ÂÊËÇ∑∏∫Ω≈ç√∂ƒ©˘˙∆˚¬…æ≈";
            let interval = setInterval(() => {
                let charToShow = message[i];

                // Start normal, then glitch after half the message
                if (i >= message.length) {
                    // 60% chance to glitch letters (except spaces)
                    if (charToShow !== ' ' && Math.random() < 0.6) {
                        charToShow = glitchChars[Math.floor(Math.random() * glitchChars.length)];
                    }
                }

                line.textContent += charToShow;
                i++;

                // Scroll to bottom
                output.scrollTop = output.scrollHeight;

                if (i >= message.length) {
                    clearInterval(interval);

                    // Optional: flicker some characters after line is done
                    let flickerCount = 0;
                    setTimeout(() => {
                        setInterval(() => {
                            let chars = line.textContent.split('');
                            for (let j = 0; j < chars.length; j++) {
                                if (chars[j] !== ' ' && Math.random() < 0.3) {
                                    chars[j] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
                                }
                            }
                            line.textContent = chars.join('');
                            flickerCount++;
                            if (flickerCount > 8) { // stop after a few flickers
                                resolve();
                            }
                        }, 100);
                    }, 200);

                }
            }, 40);
        });
    }

    async function decodeFragment(fragmentId) {
        // map fragments to hidden secrets
        const secrets = {
            "0x3a9b": "Mauro De Luca",
            "0x7f1c": "instagram.com/mauro.ciccio"
        };

        const secret = secrets[fragmentId];
        if (!secret) {
            await print("unknown fragment.");
            return;
        }

        // show initial message
        const message = `fragment ${fragmentId} → ` + secret;
        await print(message, '#FFD700');

        // delay before glitch starts
        await new Promise(r => setTimeout(r, 600));

        // glitch effect: replace chars randomly for a short duration
        const glitchDuration = 2000; // milliseconds
        const glitchInterval = 100;
        const chars = '¡€#¢§ˆ¶¨ªº–≠áß∂ƒ©µ˝˚π…æ«`≈¸ˇ˘˜˛≤˛≥≥÷œ˙é®√¥úíó‚ÂÊËÇ∑∏∫Ω≈ç√∂ƒ©˘˙∆˚¬…æ≈";';
        let startTime = Date.now();

        return new Promise(resolve => {
            const line = output.lastChild; // last printed line
            const originalText = message;
            const interval = setInterval(() => {
                let now = Date.now();
                if (now - startTime >= glitchDuration) {
                    clearInterval(interval);
                    line.textContent = originalText; // restore final text
                    resolve();
                    return;
                }

                // glitch each character randomly
                let glitched = '';
                for (let c of originalText) {
                    if (Math.random() < 0.2) { // 20% chance to glitch
                        glitched += chars[Math.floor(Math.random() * chars.length)];
                    } else {
                        glitched += c;
                    }
                }
                line.textContent = glitched;
            }, glitchInterval);
        });
    }

    function printStateMessage() {
        switch (state) {
            case 'normal':
                showAwareness("you exist quietly, just observing...", '#f5f5f5');
                break;
            case 'aware':
                showAwareness("something stirs within you; awareness grows.", '#888');
                break;
            case 'enlightened':
                showAwareness("patterns emerge, connections spark, clarity intensifies.", '#FFAA00');
                break;
            case 'unstable':
                showAwareness("consciousness fluctuates, reality feels... unstable.", '#b11212');
                glitchAwarenessText();
                localStorage.setItem('glitchmode', 'true');
                // start glitching all existing lines
                const lines = output.querySelectorAll('div');
                lines.forEach(line => {
                    const interval = glitchLineElement(line);
                    unstableGlitches.push(interval);
                });
                setTimeout(() => {
                    location.reload(); // forces full page reload to apply glitch globally
                }, 1000);
                break;
        }
    }

    function stopUnstableGlitch() {
        console.log("Stopping unstable glitch...");
        localStorage.setItem('glitchmode', 'false');
        unstableGlitches.forEach(interval => clearInterval(interval));

        // restore original text
        output.querySelectorAll('div').forEach(line => {
            if (line.getAttribute('data-original')) {
                line.textContent = line.getAttribute('data-original');
                line.removeAttribute('data-original');
            }
        });

        stopGlobalGlitch(); // also stop any global glitchings
        stopAwarenessGlitch();
        unstableGlitches = [];
        setTimeout(() => {
            location.reload(); // forces full page reload
        }, 800);
    }


    function glitchLineElement(el) {
        const glitchChars = "¡€#¢§ˆ¶¨ªº–≠áß∂ƒ©µ˝˚π…æ«`≈¸ˇ˘˜˛≤˛≥≥÷œ˙é®√¥úíó‚ÂÊËÇ∑∏∫Ω≈ç√∂ƒ©˘˙∆˚¬…æ≈";

        // Store original HTML, not just text
        if (!el.getAttribute('data-original')) {
            el.setAttribute('data-original', el.innerHTML);
        }

        return setInterval(() => {
            const originalHTML = el.getAttribute('data-original');
            let glitched = '';

            // We need to handle HTML tags so we don’t break links
            let insideTag = false;
            for (let char of originalHTML) {
                if (char === '<') insideTag = true;
                if (insideTag) {
                    glitched += char; // leave tags intact
                    if (char === '>') insideTag = false;
                } else {
                    if (char !== ' ' && Math.random() < 0.3) {
                        glitched += glitchChars[Math.floor(Math.random() * glitchChars.length)];
                    } else {
                        glitched += char;
                    }
                }
            }

            el.innerHTML = glitched;
        }, 100);
    }

    function startRipple(color = '#00FFAA') {
        if (rippleInterval) return; // already running
        currentRippleColor = color;

        let intensity = 0;
        let increasing = true; // track whether intensity is going up or down

        rippleInterval = setInterval(() => {
            // adjust intensity
            if (increasing) {
                intensity += 2;
                if (intensity >= 100) increasing = false;
            } else {
                intensity -= 2;
                if (intensity <= 0) increasing = true;
            }

            // set body background
            document.body.style.background = `radial-gradient(circle at 50% 50%, rgba(${currentRippleColor === 'gold' ? '255,215,0' : '0,255,255'},${intensity / 200}) 0%, rgba(0,0,0,0.9) 100%)`;
            overlay.style.background = `radial-gradient(circle at 50% 50%, rgba(${currentRippleColor === 'gold' ? '255,215,0' : '0,255,255'},${intensity / 200}) 0%, rgba(0,0,0,0.9) 100%)`;
        }, 40);
    }

    function stopRipple() {
        clearInterval(rippleInterval);
        rippleInterval = null;
        document.body.style.background = '';
        overlay.style.background = '';
    }

    function glowEffect() {
        const terminalWindow = document.querySelector('.terminal-window');
        if (!terminalWindow) return;
        terminalWindow.classList.add('glow');
    }

    function startGlobalGlow() {
        if (localStorage.getItem('godmode') === 'true') {
            document.body.classList.add('godmode-glow');
            document.body.classList.add('godmode');
        }
    }

    function stopGlobalGlow() {
        localStorage.setItem('godmode', 'false');
        document.body.classList.remove('godmode-glow');
        document.body.classList.remove('godmode');
    }

    function startGlobalGlitch() {
        if (localStorage.getItem('glitchmode') === 'true') {
            const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, nav');

            textElements.forEach(el => {
                // only start glitch if not already running
                const interval = glitchLineElement(el);
                unstableGlitches.push(interval);
            });

            const typedDivs = document.querySelectorAll('.typed, .cursor-line'); // returns NodeList
            typedDivs.forEach(div => {
                glitchLineElement(div);
            });
        }
    }

    function startGlobalRipple() {
        if (localStorage.getItem('sudomode') === 'true') {
            startRipple('#00FFAA');
        }
    }

    function stopGlobalRipple() {
        localStorage.setItem('sudomode', 'false');
        stopRipple();
    }

    helpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openTerminal();
    });

    input.addEventListener('input', () => {
        const cmd = input.value.trim().toLowerCase();
        // Check if command is in helpList, hiddenCommands, or is the special 'sudo override'
        if (helpList.includes(cmd) || hiddenCommands.includes(cmd) || cmd === 'sudo override') {
            input.style.color = '#b11212'; // green for valid commands
        } else {
            input.style.color = ''; // default color for invalid
        }
    });

    let historyIndex = history.length;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const cmd = input.value.trim();
            if (!cmd) return;
            handleCommand(cmd);
            input.value = '';
            historyIndex = history.length; // reset index after new command
        } else if (e.key === 'Escape') {
            closeTerminal();
        } else if (e.key === 'ArrowUp') {
            if (history.length === 0) return;
            historyIndex = Math.max(0, historyIndex - 1);
            input.value = history[historyIndex] || '';
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            if (history.length === 0) return;
            historyIndex = Math.min(history.length - 1, historyIndex + 1);
            input.value = history[historyIndex] || '';
            e.preventDefault();
        }
    });
});
