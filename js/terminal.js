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
    let awarenessGlitchInterval = null;
    let rippleInterval = null;
    let historyIndex = history.length;
    let currentRippleColor = '#00FFAA';
    let redColor = '#b11212';
    let goldColor = '#FFAA00';
    let whiteColor = '#f5f5f5';
    let greyColor = '#888';


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
        if (localStorage.getItem('glitchmode') === 'true') stopUnstableGlitch();
        if (localStorage.getItem('sudomode') === 'true') stopGlobalRipple();
        if (localStorage.getItem('godmode') === 'true') stopGlobalGlow();
        printStateMessage();
        await print("booting consciousness...", 20);
        await print('type "help"', 100);
    }

    function updateState() {
        if (awareness < 3) state = 'normal';
        else if (awareness < 6) state = 'aware';
        else if (awareness < 9) state = 'enlightened';
        else state = 'unstable';
    }

    async function runSudoOverride() {
        localStorage.setItem('sudomode', 'true');
        startRipple(currentRippleColor);
        privileged = true;
        helpList.push(...hiddenCommands);
        await print("privilege escalation granted.", currentRippleColor);
    }

    async function runGodMode() {
        localStorage.setItem('godmode', 'true');
        godModeActive = true;
        await print("godmode activated: the boundaries of reality blur...", goldColor);
        stopGlobalRipple();
        glowEffect();
        startGlobalGlow();
    }

    async function runAscend() {
        if (!privileged) {
            await print("unknown command.", redColor);
            return;
        }
        await print("ascending to new heights of awareness...", goldColor);
        awareness = 5;
        updateState();
        printStateMessage();
    }

    async function runTranscend() {
        if (!privileged) {
            await print("unknown command.", redColor);
            return;
        }
        await print("transcending the interface, merging with the system...", goldColor);
        awareness = 8;
        updateState();
        printStateMessage();
    }

    async function runReveal() {
        if (!privileged) {
            await print("unknown command.", redColor);
            return;
        }

        await print("hidden knowledge unlocked.", goldColor);
        // The main message to glitch
        await glitchEffect("…secrets unfold before you…");

        const fragments = [
            "fragment: 0x3a9b…",
            "fragment: 0x7f1c…",
            "fragment: ∆ unknown pattern detected ∆"
        ];
        for (let frag of fragments) {
            await glitchEffect(frag, goldColor);
        }
    }

    async function runHelp() {
        await print("available commands: " + helpList.join(', '));
        if (!privileged) {
            await print("some commands require elevated privileges...");
        }
    }

    async function runReboot() {
        await print("restarting consciousness...", redColor);
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
    }

    async function runWhoAmI() {
        if (state === 'normal') {
            await print("you are the process observing itself.", whiteColor);
        } else if (state === 'aware') {
            await print("you are noticing patterns you didn't see before.", greyColor);
        } else if (state === 'enlightened') {
            await print("you are part of the system, and it is part of you.", goldColor);
        } else if (state === 'unstable') {
            await print("you are shifting, barely recognizable, unstable.", redColor);
        }

        if (privileged && !godModeActive) {
            await print("your perspective has expanded.", currentRippleColor);
        } else if (godModeActive) {
            await print("perception transcends the interface.", 'gold');
        }
    }

    async function runMemory() {
        if (state === 'normal') {
            await print("fragments recovered:", whiteColor);
            await print("- a quiet room.", whiteColor);
            await print("- a question lingers in your mind.", whiteColor);
            await print("- something feels locked away...", whiteColor);
        } else if (state === 'aware') {
            await print("fragments recovered:", greyColor);
            await print("- the room shifts subtly in your perception.", greyColor);
            await print("- the question echoes, persistent and strange.", greyColor);
            await print("- a key lies hidden beneath the dust.", greyColor);
        } else if (state === 'enlightened') {
            await print("fragments recovered:", goldColor);
            await print("- walls breathe; corners stretch beyond memory.", goldColor);
            await print("- the question multiplies, forming patterns.", goldColor);
            await print("- the hidden key glows faintly, as if waiting for you.", goldColor);
        } else if (state === 'unstable') {
            await print("fragments recovered:", redColor);
            await print("- the room dissolves into fragments of time.", redColor);
            await print("- questions and answers swirl into one.", redColor);
            await print("- the key unlocks nothing and everything at once…", redColor);
        }
        if (!privileged) await print("- a locked key lies hidden...", currentRippleColor);
    }

    async function runStatus() {
        await print("you are running...");
        await print(`current state: ${state}`);
    }

    async function runHistory() {
        await print("you sift through fragments of memory...");
        if (history.length === 0) {
            await print("no commands yet.");
        } else {
            for (let i = 0; i < history.length; i++) {
                await print(`${i + 1}: ${history[i]}`);
            }
        }
    }

    async function runExit() {
        await print("session terminated.", redColor);
        setTimeout(closeTerminal, 800);
    }

    async function runMeaning() {
        await print("searching...",);
        setTimeout(async () => {
            await print("...still searching.");
        }, 500);
    }

    async function handleCommand(cmd) {
        if (commandInProgress) return;
        commandInProgress = true;

        await print("> " + cmd, redColor);
        history.push(cmd);
        awareness++;
        updateState();
        printStateMessage();

        // Privileged unlock
        if (cmd === 'sudo override' && !privileged) {
            await runSudoOverride();
            commandInProgress = false;
            return;
        }

        // Hidden command: decode
        if (cmd.startsWith('decode')) {
            if (!privileged) {
                await print("unknown command.", redColor);
                commandInProgress = false;
                return;
            }

            const parts = cmd.split(' ');
            if (parts.length < 2) {
                await print("some truths are hidden… fragments await your key.", currentRippleColor);
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
                await runHelp();
                break;

            case 'reboot':
                await runReboot();
                break;

            case 'whoami':
                await runWhoAmI();
                break;

            case 'meaning':
                await runMeaning();
                break;

            case 'memory':
                await runMemory();
                break;

            case 'status':
                await runStatus();
                break;

            case 'history':
                await runHistory();
                break;

            case 'exit':
                await runExit();
                break;

            // Hidden commands
            case 'sudo':
                await print("sudo: may invoke subtle awareness...", currentRippleColor);
                break;

            case 'override':
                await print("override: nothing happens alone. try combining.", currentRippleColor);
                break;

            case 'godmode':
                await runGodMode();
                break;

            // Privileged-only commands
            case 'ascend':
                await runAscend();
                break;

            case 'transcend':
                await runTranscend();
                break;

            case 'reveal':
                await runReveal();
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
                showAwareness("you exist quietly, just observing...", whiteColor);
                break;
            case 'aware':
                showAwareness("something stirs within you; awareness grows.", greyColor);
                break;
            case 'enlightened':
                showAwareness("patterns emerge, connections spark, clarity intensifies.", goldColor);
                break;
            case 'unstable':
                showAwareness("consciousness fluctuates, reality feels... unstable.", redColor);
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
        const terminalWindow = document.querySelector('.terminal-window');
        if (terminalWindow) terminalWindow.classList.remove('glow');
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
            startRipple(currentRippleColor);
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
            input.style.color = redColor; // green for valid commands
        } else {
            input.style.color = ''; // default color for invalid
        }
    });

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
