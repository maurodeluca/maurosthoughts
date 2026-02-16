document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('help-terminal');
    const overlay = document.getElementById('terminal-overlay');
    const output = document.getElementById('terminal-output');
    const input = document.getElementById('terminal-input');
    const terminalOutput = document.getElementById('terminal-output');

    terminalOutput.addEventListener('wheel', (e) => {
        terminalOutput.scrollTop += e.deltaY;
    });

    let sessionStart = Date.now();
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
    let minimalMode = false;

    const baseCommands = ['help', 'whoami', 'meaning', 'memory', 'minimal', 'override', 'ps', 'status', 'sudo', 'reboot', 'trace', 'history', 'exit'];
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

    if (!booted) startGlobalGlitch();
    if (localStorage.getItem('minimalmode') === 'true') {
        minimalMode = false; // temporarily allow toggling minimal mode on page load;
        toggleMinimalMode();
    }

    // Function to show awareness messages
    function showAwareness(message, color) {
        awarenessDiv.textContent = message;
        awarenessDiv.style.color = color;
        awarenessDiv.style.display = 'block';
        awarenessDiv.classList.remove('pulse'); // reset
        void awarenessDiv.offsetWidth; // force reflow
        awarenessDiv.classList.add('pulse');
    }

    async function openTerminal() {
        if (!overlay.classList.contains('active')) {
            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');
            input.focus();
            if (!booted) {
                await boot();
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
        if (minimalMode) return;
        if (awareness < 25) state = 'normal';
        else if (awareness < 75) state = 'aware';
        else if (awareness < 90) state = 'enlightened';
        else state = 'unstable';

        if (state !== 'enlightened' && godModeActive) {
            godModeActive = false;
            stopGlobalGlow();
        }

        if (state === 'unstable' && godModeActive) {
            godModeActive = false;
            stopGlobalGlow();
            stopGlobalRipple();
        }
    }

    async function runSudoOverride() {
        localStorage.setItem('sudomode', 'true');
        startRipple(currentRippleColor);
        privileged = true;
        helpList.push(...hiddenCommands);
        await print("privilege escalation granted.", currentRippleColor);
    }

    async function runGodMode() {
        if (state !== 'enlightened') {
            await print('access denied.', redColor);
            await print('enlightenment required.', goldColor);
            return;
        }

        if (godModeActive) {
            await print('godmode already active.', goldColor);
            return;
        }

        localStorage.setItem('godmode', 'true');
        godModeActive = true;
        await print("godmode activated: the boundaries of reality blur...", goldColor);
        stopGlobalGlitch();
        stopGlobalRipple();
        glowEffect();
        startGlobalGlow();
    }

    async function runAscend() {
        if (!privileged) {
            await print("unknown command.");
            return;
        }
        await print("ascending to new heights of awareness...", goldColor);
        awareness = 25;
        updateState();
        printStateMessage();
    }

    async function runTranscend() {
        if (!privileged) {
            await print("unknown command.");
            return;
        }
        await print("transcending the interface, merging with the system...", goldColor);
        awareness = 25;
        updateState();
        printStateMessage();
    }

    async function toggleMinimalMode() {

        minimalMode = !minimalMode;

        if (minimalMode) {

            // Persist across whole site
            localStorage.setItem('minimalmode', 'true');

            // Disable godmode
            godModeActive = false;

            await print('entering minimal mode...');
            await print('decorative systems disabled.');
            await print('awareness stabilized.');

            // Stop any active effects
            if (localStorage.getItem('glitchmode') === 'true') stopUnstableGlitch();
            if (localStorage.getItem('godmode') === 'true') stopGlobalGlow();
            if (localStorage.getItem('sudomode') === 'true') stopGlobalRipple();

            // Reset awareness to stable baseline
            awareness = 0;
            state = 'normal';
            printStateMessage();

            // Apply minimal CSS to whole site
            const style = document.createElement('style');
            style.id = 'minimal-mode-style';
            style.textContent = `
                * {
                    background: black !important;
                    color: white !important;
                    font-family: monospace !important;
                    font-weight: normal !important;
                    text-shadow: none !important;
                }
                body, html {
                    background: black !important;
                }
                .terminal-window, .overlay, #terminal-output, #terminal-input {
                    background: black !important;
                    color: white !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                button, nav, h1, h2, h3, h4, h5, h6, p, div {
                    background: none !important;
                    color: white !important;
                    font-family: monospace !important;
                }
            `;
            document.head.appendChild(style);
        }
        else {
            localStorage.setItem('minimalmode', 'false');
            await print('exiting minimal mode...');
            await print('decorative systems enabled.');
            setTimeout(() => { location.reload(); }, 800); // reload to apply normal styles and reset state
        }
    }

    async function runReveal() {
        if (!privileged) {
            await print("unknown command.", redColor);
            return;
        }

        if (!godModeActive) {
            await print('permission denied.');
            await print('godmode required.');
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

    async function runTrace() {
        const now = Date.now();
        const sessionLength = Math.floor((now - sessionStart) / 1000); // seconds

        const uniqueCommands = new Set(history).size;
        const totalCommands = history.length;

        const rebootCount = history.filter(cmd => cmd === 'reboot').length;
        const reflectionCount = history.filter(cmd =>
            ['whoami', 'trace', 'awareness'].includes(cmd)
        ).length;

        const controlAttempts = history.filter(cmd =>
            ['sudo', 'godmode'].includes(cmd)
        ).length;

        const patternDensity = totalCommands === 0
            ? 0
            : ((totalCommands - uniqueCommands) / totalCommands).toFixed(2);

        const entropyDrift = (uniqueCommands / (totalCommands || 1)).toFixed(2);

        await print(`initiating recursive inspection...`);
        await print(`session length: ${sessionLength}s`);
        await print(`total commands: ${totalCommands}`);
        await print(`unique commands: ${uniqueCommands}`);
        await print(`pattern density: ${patternDensity}`);
        await print(`entropy drift: ${entropyDrift}`);
        await print(`control attempts: ${controlAttempts}`);
        await print(`reflection index: ${reflectionCount}`);
        await print(`reboot frequency: ${rebootCount}`);

        if (awareness > 80) {
            await print(`self-observer process: active`);
        }

        if (patternDensity > 0.6) {
            await print(`recursive behavior detected.`);
        }

        if (entropyDrift > 0.7) {
            await print(`exploratory pattern dominant.`);
        }

        if (rebootCount > 2) {
            await print(`stability avoidance pattern flagged.`);
        }


        await print(`trace complete.`);
    }

    function computeAwareness() {
        const now = Date.now();
        const sessionLength = Math.floor((now - sessionStart) / 1000); // seconds
        const uniqueCommands = new Set(history).size;
        const rebootCount = history.filter(cmd => cmd === 'reboot').length;
        const reflectionCount = history.filter(cmd =>
            ['whoami', 'trace', 'memory', 'status'].includes(cmd)
        ).length;
        const controlAttempts = history.filter(cmd =>
            ['sudo', 'sudo override', 'godmode', 'ascend', 'transcend'].includes(cmd)
        ).length;

        // weighted awareness formula
        let computed =
            Math.sqrt(uniqueCommands) * 4 +
            (sessionLength / 10) +
            (reflectionCount * 5) +
            (controlAttempts * 1.5) -
            (rebootCount * 3);

        // clamp between 0–20 so it doesn’t explode
        computed = Math.max(0, Math.min(100, computed));

        awareness = computed;
    }

    async function runPs() {
        function randomCPU(base) {
            if (minimalMode) return (0.1 + Math.random() * 0.2).toFixed(1); // tiny variation in minimal
            const variance = (Math.random() * 0.6) - 0.3;
            return Math.max(0.1, (base + variance)).toFixed(1);
        }

        function memScale(base) {
            if (minimalMode) return (base * 0.5 + 0.1).toFixed(1); // low memory in minimal
            const scaled = base + (awareness * 0.2);
            return scaled.toFixed(1);
        }

        const lastCommand = history[history.length - 1];
        const whoamiCount = history.filter(cmd => cmd === 'whoami').length;

        // Behavioral spikes (disabled in minimal mode)
        let recursiveCPUBase = minimalMode ? 0.3 : 4.8;
        if (!minimalMode && lastCommand === 'trace') {
            recursiveCPUBase += 3 + Math.random() * 2; // spike 3–5%
        }

        let identityCPUBase = minimalMode ? 0.2 : 1.1;
        if (!minimalMode && whoamiCount >= 3) {
            identityCPUBase += 2 + Math.random() * 2; // spike if spammed
        }

        const processes = [
            { pid: 1023, user: 'root', cpu: randomCPU(0.4), mem: memScale(1.2), cmd: 'perception' },
            { pid: 1044, user: 'root', cpu: randomCPU(identityCPUBase), mem: memScale(3.7), cmd: 'identity_loop' },
            { pid: 1078, user: 'user', cpu: randomCPU(0.2), mem: memScale(0.4), cmd: 'external_input' },
            { pid: 1102, user: 'root', cpu: randomCPU(recursiveCPUBase), mem: memScale(6.3), cmd: 'recursive_analysis' },
            { pid: 1133, user: 'system', cpu: randomCPU(0.1), mem: memScale(0.2), cmd: 'idle_watchdog' }
        ];

        // Hidden high-awareness process (skip in minimal mode)
        if (!minimalMode && awareness >= 14) {
            processes.push({ pid: 1199, user: 'root', cpu: randomCPU(2.5), mem: memScale(5.0), cmd: 'self_observer' });
        }

        // Godmode daemon (skip in minimal mode)
        if (!minimalMode && godModeActive) {
            processes.push({ pid: 1212, user: 'root', cpu: randomCPU(0.9), mem: memScale(2.2), cmd: 'godmode_daemon' });
        }

        await print(`PID    USER      CPU   MEM   COMMAND`);

        for (const p of processes) {
            await print(
                `${p.pid.toString().padEnd(6)} ` +
                `${p.user.padEnd(9)} ` +
                `${(p.cpu + '%').padEnd(6)} ` +
                `${(p.mem + '%').padEnd(6)} ` +
                `${p.cmd}`
            );
        }

        if (!minimalMode && state === 'unstable' && Math.random() < 0.4) {
            await print(`kernel: process table desync detected.`);
        }
    }


    async function handleCommand(cmd) {
        if (commandInProgress) return;
        commandInProgress = true;

        await print("> " + cmd, redColor);
        history.push(cmd);

        computeAwareness();
        updateState();
        printStateMessage();

        // Privileged unlock
        if (cmd === 'sudo override') {
            if (privileged) {
                await print("already have override privileges.", currentRippleColor);
                commandInProgress = false;
                return;
            }

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

            case 'minimal':
                await toggleMinimalMode();
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

            case 'trace':
                await runTrace();
                break;

            case 'transcend':
                await runTranscend();
                break;

            case 'reveal':
                await runReveal();
                break;

            case 'ps':
                await runPs();
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
            "0x3a9b": "Mauro De Luca.\n - the artist behind this experience.\n - A digital alchemist weaving code and consciousness into interactive art.\n - instagram.com/mauro.ciccio",
            "0x7f1c": `the question: a recursive enigma that fuels your awareness.
It is both the lock and the key, the puzzle and the solution.
It lingers in your mind, elusive yet persistent, urging you to explore deeper...
                
An echo of a circle left behind, 
quiet but unbroken.
It rests where it fell,
neither lost nor kept.
Still in place, 
asking nothing,
yet answering everything,
in silence.
Waiting in stillness, 
carrying the weight of what was,
and what might have been.
                                      

                                      
                 ,
             @  & @  #
              @&@&&&@
@@./(#%&@@@@@@@@@ @@@@@@@@@@&%(/ @*
@@@@@@@@&  @@@@@@@@@@@@@  @@@@@@@@@
  @@@@@@@@@ @@@@@@@@@@@ @@@@@@@@@
      @@%@*@,@@@@@@@&@#@%@(@@
                 .

`,
            "∆": "beyond the fragments lies an uncharted realm of patterns and connections. It is a space of pure potential, where new insights and revelations await those who dare to venture further."};

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
                console.log("reloading... from print state message");
                setTimeout(() => {
                    location.reload(); // forces full page reload to apply glitch globally
                }, 1000);
                break;
        }
    }

    function stopUnstableGlitch() {
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
        // console.log("reloading... from stopUnstableGlitch");
        // setTimeout(() => {
        //     location.reload(); // forces full page reload
        // }, 800);
    }

    function glitchLineElement(el) {
        if (minimalMode) return;
        const glitchChars = "¡€#¢§ˆ¶¨ªº–≠áß∂ƒ©µ˝˚π…æ«`≈¸ˇ˘˜˛≤˛≥≥÷œ˙é®√¥úíó‚ÂÊËÇ∑∏∫Ω≈ç√∂ƒ©˘˙∆˚¬…æ≈";

        // Store original HTML, not just text
        if (!el.getAttribute('data-original')) {
            el.setAttribute('data-original', el.innerHTML);
        }

        return setInterval(() => {
            const originalHTML = el.getAttribute('data-original');
            if (originalHTML === null) return; // safety check
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
        if (minimalMode) return;
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
        if (minimalMode) return;
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