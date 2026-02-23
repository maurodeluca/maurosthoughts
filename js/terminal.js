document.addEventListener('DOMContentLoaded', async () => {
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
    let commandInProgress = false;
    let isAscended = false;
    let isTranscended = false;
    let minimalMode = false;
    let sudoMode = false;
    let godMode = false;
    let unstableMode = false;
    let awarenessGlitchInterval = null;
    let historyIndex = history.length;
    let sudoColor = '#00FFAA';
    let redColor = '#b11212';
    let goldColor = '#FFAA00';
    let whiteColor = '#f5f5f5';
    let snakeActive = false;
    let snakeDir = { r: 0, c: 1 }; // initial right

    const baseCommands = ['ascend', 'exit', 'help', 'history', 'life', 'meaning', 'memory', 'minimal', 'override', 'ps', 'reboot', 'snake', 'status', 'sudo', 'trace', 'whoami',];
    const hiddenCommands = ['decode', 'godmode', "reveal", "transcend"];
    let helpList = [...baseCommands];

    // Create awareness overlay (once)
    const awarenessDiv = document.createElement('div');
    awarenessDiv.style.position = 'absolute';
    awarenessDiv.style.top = '40px';
    awarenessDiv.style.width = '100%';
    awarenessDiv.style.textAlign = 'center';
    awarenessDiv.style.fontStyle = 'italic';
    awarenessDiv.style.display = 'none';
    awarenessDiv.textContent = "";
    overlay.appendChild(awarenessDiv);

    // toggle modes on reload
    if (localStorage.getItem('minimalmode') === 'true') {
        minimalMode = false;
        await toggleMinimalMode(false);
    }
    if (localStorage.getItem('unstablemode') === 'true') {
        unstableMode = false;
        toggleUnstableMode();
        requestAnimationFrame(toggleUnstableMode);
    }
    if (localStorage.getItem('sudomode') === 'true') {
        sudoMode = false;
        toggleSudoMode();
    }
    if (localStorage.getItem('godmode') === 'true') {
        godMode = false;
        toggleGodMode();
    }

    // Function to show awareness messages
    function showAwareness(message, color) {
        awarenessDiv.style.display = 'none';
        awarenessDiv.textContent = message;
        awarenessDiv.setAttribute('data-original', message);
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
            if (originalText == null) return;
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

        printStateMessage();
    }

    function stopAwarenessGlitch() {
        if (awarenessGlitchInterval) clearInterval(awarenessGlitchInterval);
        awarenessGlitchInterval = null;
        if (awarenessDiv.getAttribute('data-original')) {
            awarenessDiv.textContent = awarenessDiv.getAttribute('data-original');
            awarenessDiv.removeAttribute('data-original');
        }
    }

    function closeTerminal() {
        input.blur();
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        output.innerHTML = '';
        commandInProgress = false;
        overlay.style.background = '';
    }

    function print(text = '', color = '') {
        return new Promise(resolve => {

            const line = document.createElement('div');
            if (godMode) color = 'gold';
            if (color) line.style.color = color;

            // If text is empty, set a non-breaking space
            line.textContent = text.length === 0 ? '\u00A0' : '';

            output.appendChild(line);

            if (text.length === 0) {
                output.scrollTop = output.scrollHeight;
                resolve();
                return;
            }

            let i = 0;
            const interval = setInterval(() => {
                line.textContent += text[i];
                i++;

                if (i >= text.length) {
                    clearInterval(interval);

                    if (state === 'unstable') {
                        glitchLineElement(line);
                        if (localStorage.getItem('unstablemode') === 'false') {
                            toggleUnstableMode();
                             requestAnimationFrame(toggleUnstableMode);
                    }

                    resolve();
                }

                output.scrollTop = output.scrollHeight;
            }, 20);
        });
    }

    async function boot() {
        if (localStorage.getItem('minimalmode') === 'true') {
            minimalMode = false; // temporarily allow toggling minimal mode on page load;
            await toggleMinimalMode(false);
        }

        if (localStorage.getItem('sudomode') === 'true') {
            sudoMode = false; // temporarily allow toggling sudo mode on page load;
            toggleSudoMode();
        }

        if (localStorage.getItem('godmode') === 'true') {
            godMode = false; // temporarily allow toggling sudo mode on page load;
            toggleGodMode();
        }

        if (localStorage.getItem('unstablemode') === 'true') {
            unstableMode = false; // temporarily allow toggling sudo mode on page load;
            toggleUnstableMode();
            requestAnimationFrame(toggleUnstableMode();
        }
        printStateMessage();
        await print("booting consciousness...", 20);
        await print('type "help"', 100);
    }

    function updateState() {
        if (awareness < 25) state = 'normal';
        else if (awareness < 75) state = 'aware';
        else if (awareness < 90) state = 'enlightened';
        else state = 'unstable';

        if (state !== 'enlightened' && godMode) {
            toggleGodMode();
        }
    }

    async function runSudoOverride() {
        toggleSudoMode(sudoColor);
        privileged = true;
        helpList.push(...hiddenCommands);
        await print("privilege escalation granted.", sudoColor);
    }

    async function runGodMode() {
        if (state !== 'enlightened') {
            await print('access denied.', redColor);
            await print('enlightenment required.', goldColor);
            return;
        }

        if (godMode) {
            await print('godmode already active.', goldColor);
            return;
        }

        await print("godmode activated: the boundaries of reality blur...", goldColor);
        toggleGodMode();
    }

    async function runAscend() {
        if (isAscended) {
            await print("already ascended...")
            return;
        }

        await print("ascending to new heights of awareness...", sudoColor);
        isAscended = true;
        computeAwareness();
        updateState();
        printStateMessage();
    }

    async function runTranscend() {
        if (!privileged) {
            await print("unknown command.");
            return;
        }

        if (state === "unstable") {
            await print("you are unstable...", redColor)
            return;
        }

        if (isTranscended) {
            await print("already transcended...")
            return;
        }
        await print("transcending the interface, merging with the system...", goldColor);
        isTranscended = true;
        computeAwareness();
        updateState();
        printStateMessage();
    }

    async function runReveal() {
        if (!privileged) {
            await print("unknown command.", redColor);
            return;
        }

        if (!godMode) {
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
            await glitchEffect(frag);
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
        output.innerHTML = '';
        if (localStorage.getItem('minimalmode') === 'true') {
            minimalMode = true;
            await toggleMinimalMode(false);
        }
        setTimeout(() => {
            // disable modes on reboot
            if (localStorage.getItem('unstablemode') === 'true') {
                unstableMode = true;
                toggleUnstableMode();
                 requestAnimationFrame(toggleUnstableMode);
            }
            if (localStorage.getItem('sudomode') === 'true') {
                sudoMode = true;
                toggleSudoMode();
            }
            if (localStorage.getItem('godmode') === 'true') {
                godMode = false;
                toggleGodMode();
            }
            awareness = 0;
            state = 'normal';
            sessionStart = Date.now();
            commandInProgress = false;
            isAscended = false;
            isTranscended = false;
            history = [];
            privileged = false;
            booted = false;
            printStateMessage();

            setTimeout(() => boot(), 800);
        }, 600);
    }

    async function runWhoAmI() {
        if (state === 'normal') {
            await print("you are the process observing itself.", whiteColor);
        } else if (state === 'aware') {
            await print("you are noticing patterns you didn't see before.", sudoColor);
        } else if (state === 'enlightened') {
            await print("you are part of the system, and it is part of you.", goldColor);
        } else if (state === 'unstable') {
            await print("you are shifting, barely recognizable, unstable.", redColor);
        }

        if (privileged && !godMode) {
            await print("your perspective has expanded.", sudoColor);
        } else if (godMode) {
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
            await print("fragments recovered:", sudoColor);
            await print("- the room shifts subtly in your perception.", sudoColor);
            await print("- the question echoes, persistent and strange.", sudoColor);
            await print("- a key lies hidden beneath the dust.", sudoColor);
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
        if (!privileged) await print("- a locked key lies hidden...", sudoColor);
    }

    async function runStatus() {
        const formattedAwareness = parseFloat(awareness.toFixed(5));
        await print(`you are ${state}... ${formattedAwareness}%`);
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
        if (!minimalMode && godMode) {
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
        if (!isAscended && !isTranscended) {
            awareness =
                Math.sqrt(uniqueCommands) * 1.5 +
                (sessionLength / 60) +
                (reflectionCount * 2.5) +
                (controlAttempts * 1.5) -
                (rebootCount * 3);

            if (minimalMode) awareness = Math.max(0, Math.min(75, awareness));
            else if (privileged) awareness = Math.max(0, Math.min(100, awareness));
            else awareness = Math.max(0, Math.min(50, awareness));
        }

        if (isAscended && !isTranscended) {
            if (awareness < 25)
                awareness = Math.max(awareness, awareness + 25);
            else {
                awareness =
                    Math.sqrt(uniqueCommands) * 4 +
                    (sessionLength / 60) +
                    (reflectionCount * 5) +
                    (controlAttempts * 1.5) -
                    (rebootCount * 3) + 25;
            }
            if (minimalMode) awareness = Math.max(0, Math.min(75, awareness));
            else if (privileged) awareness = Math.max(0, Math.min(100, awareness));
            else awareness = Math.max(0, Math.min(50, awareness));
        }
        if (isTranscended) {
            if (awareness < 75)
                awareness = Math.max(awareness, awareness + Math.abs(75 - awareness));
            else {
                awareness =
                    Math.sqrt(uniqueCommands) * 4 +
                    (sessionLength / 60) +
                    (reflectionCount * 5) +
                    (controlAttempts * 1.5) -
                    (rebootCount * 3);
                awareness += 75;
            }
            if (minimalMode) awareness = Math.max(0, Math.min(75, awareness));
            else if (privileged) awareness = Math.max(0, Math.min(100, awareness));
            else awareness = Math.max(0, Math.min(50, awareness));
        }
    }

    async function handleCommand(cmd) {
        if (commandInProgress) return;
        commandInProgress = true;

        await print("> " + cmd, redColor);
        history.push(cmd);

        computeAwareness();
        updateState();

        if (cmd !== "reboot") {
            printStateMessage();
        }

        // Privileged unlock
        if (cmd === 'sudo override') {
            if (privileged) {
                await print("already have override privileges.", sudoColor);
                commandInProgress = false;
                return;
            }

            if (!isAscended) await runAscend();
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
                await print("some truths are hidden… fragments await your key.", sudoColor);
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
                await toggleMinimalMode(true);
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
                await print("sudo: may invoke subtle awareness...", sudoColor);
                break;

            case 'override':
                await print("override: nothing happens alone. try combining.", sudoColor);
                break;

            case 'godmode':
                await runGodMode();
                break;

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

            case 'life':
                await runLife();
                break;
            case 'snake':
                await runSnake();
                break;

            case 'ps':
                await runPs();
                break;

            default:
                await print("unknown command.");
        }
        commandInProgress = false;
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
            "∆": "beyond the fragments lies an uncharted realm of patterns and connections. It is a space of pure potential, where new insights and revelations await those who dare to venture further."
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
                showAwareness("something stirs within you; awareness grows.", sudoColor);
                break;
            case 'enlightened':
                showAwareness("patterns emerge, connections spark, clarity intensifies.", goldColor);
                break;
            case 'unstable':
                showAwareness("consciousness fluctuates, reality feels... unstable.", redColor);
                break;
        }
    }

    function glitchLineElement(el) {
        if (minimalMode) return;
        const glitchChars = "¡€#¢§ˆ¶¨ªº–≠áß∂ƒ©µ˝˚π…æ«`≈¸ˇ˘˜˛≤˛≥≥÷œ˙é®√¥úíó‚ÂÊËÇ∑∏∫Ω≈ç√∂ƒ©˘˙∆˚¬…æ≈";
        el.style.transform = 'translateZ(0)';
        el.style.willChange = 'contents';
        
        // Store original HTML, not just text
        if (!el.getAttribute('data-original')) {
            el.setAttribute('data-original', el.innerHTML);
        }

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

    function glowEffect() {
        const terminalWindow = document.querySelector('.terminal-window');
        if (!terminalWindow) return;
        terminalWindow.classList.add('godmode-glow');
        document.body.classList.add('godmode');
    }

    function stopGlobalGlitch() {
        const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, nav, .typed, .cursor-line, .nav');
        textElements.forEach(el => {
            if (el.getAttribute('data-original')) {
                el.innerHTML = el.getAttribute('data-original'); // restore HTML
                el.removeAttribute('data-original');
            }
        });

        // restore original text
        output.querySelectorAll('div').forEach(line => {
            if (line.getAttribute('data-original')) {
                line.textContent = line.getAttribute('data-original');
                line.removeAttribute('data-original');
            }
        });

        stopAwarenessGlitch();
        awarenessGlitchInterval = null;
    }

    function stopGlobalRipple() {
        const terminalWindow = document.querySelector('.terminal-window');
        if (terminalWindow) terminalWindow.classList.remove('sudomode-glow');
        document.body.classList.remove('sudomode-glow');
        document.body.classList.remove('sudomode');
    }

    function stopGlobalGlow() {
        const terminalWindow = document.querySelector('.terminal-window');
        if (terminalWindow) terminalWindow.classList.remove('godmode-glow');
        document.body.classList.remove('godmode-glow');
        document.body.classList.remove('godmode');
    }

    function toggleSudoMode() {
        if (minimalMode) return;
        if (godMode) toggleGodMode();

        sudoMode = !sudoMode;

        if (!sudoMode) {
            stopGlobalRipple();
            localStorage.setItem('sudomode', 'false');
            return;
        }

        const terminalWindow = document.querySelector('.terminal-window');
        if (!terminalWindow) return;
        terminalWindow.classList.add('sudomode-glow');
        document.body.classList.add('sudomode');
        localStorage.setItem('sudomode', 'true');
    }

    function toggleGodMode() {
        if (sudoMode) toggleSudoMode();

        godMode = !godMode

        if (minimalMode) return;

        if (!godMode) {
            stopGlobalGlow();
            localStorage.setItem('godmode', 'false');
            return;
        }

        glowEffect();
        localStorage.setItem('godmode', 'true');
    }

    function toggleUnstableMode() {
        if (minimalMode) return;
        if (sudoMode) toggleSudoMode();

        unstableMode = !unstableMode;

        if (!unstableMode) {
            stopGlobalGlitch();
            localStorage.setItem('unstablemode', 'false');
            return;
        }

        printStateMessage();
        glitchAwarenessText();

        // start glitching all existing lines
        const lines = output.querySelectorAll('div');
        lines.forEach(line => {
            glitchLineElement(line);
        });
        const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, nav');

        textElements.forEach(el => {
            // only start glitch if not already running
            glitchLineElement(el);
        });

        const typedDivs = document.querySelectorAll('.typed, .cursor-line'); // returns NodeList
        typedDivs.forEach(div => {
            glitchLineElement(div);
        });

        localStorage.setItem('unstablemode', 'true');
        requestAnimationFrame(toggleUnstableMode);
    }

    async function toggleMinimalMode(verbose) {
        if (unstableMode) {
            if (verbose) await print("minimal mode not available... try reboot...")
            return;
        }

        minimalMode = !minimalMode;

        if (!minimalMode) {
            localStorage.setItem('minimalmode', 'false');
            if (verbose) {
                await print('exiting minimal mode...');
                await print('decorative systems enabled.');
            }

            document.body.classList.remove('minimal-mode');
            return;
        }

        if (verbose) {
            await print('entering minimal mode...');
            await print('decorative systems disabled.');
            await print('awareness stabilized.');
        }

        if (localStorage.getItem('godmode') === 'true') toggleGodMode();
        if (localStorage.getItem('sudomode') === 'true') toggleSudoMode();

        document.body.classList.add('minimal-mode');
        localStorage.setItem('minimalmode', 'true');
    }

    function scrollTerminalToBottom() {
        const terminal = document.getElementById('terminal-output');
        terminal.scrollTop = terminal.scrollHeight;
    }

    async function runSnake() {
        snakeActive = true;
        await print("The serpent stirs in the shadows…", goldColor);
        await print("Its hunger awaits… will you guide it?", goldColor);
        await print("");
        await print("Controls:");
        await print("W = Up");
        await print("A = Left");
        await print("S = Down");
        await print("D = Right");
        await print("");
        await new Promise(r => setTimeout(r, 500)); // short pause

        const rows = 20;
        const cols = 20;
        let snake = [{ r: 5, c: 10 }];
        let apple = { r: Math.floor(Math.random() * rows), c: Math.floor(Math.random() * cols) };
        let alive = true;
        let startTime = Date.now();

        // Create a single div for the game
        const gameLine = document.createElement('div');
        gameLine.classList.add('snake-grid');
        output.appendChild(gameLine);

        function drawGrid() {
            let grid = '';

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {

                    if (snake.some(s => s.r === r && s.c === c)) {
                        grid += '<span class="snake">██</span>';
                    } else if (apple.r === r && apple.c === c) {
                        // If column is even → space on left
                        if (c % 2 === 0) {
                            grid += '<span class="apple">◉◉</span>';
                        } else {
                            grid += '<span class="apple">◉◉</span>';
                        }
                    } else {
                        grid += '<span class="empty">░░</span>';
                    }
                }
                grid += '\n';
            }

            return grid;
        }

        function moveSnake() {
            const head = { r: snake[0].r + snakeDir.r, c: snake[0].c + snakeDir.c };
            // collisions
            if (
                head.r < 0 || head.r >= rows ||
                head.c < 0 || head.c >= cols ||
                snake.some(s => s.r === head.r && s.c === head.c)
            ) {
                alive = false;
                return;
            }

            snake.unshift(head);

            if (head.r === apple.r && head.c === apple.c) {
                apple = { r: Math.floor(Math.random() * rows), c: Math.floor(Math.random() * cols) };
            } else {
                snake.pop();
            }
        }

        function render() {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            gameLine.innerHTML = drawGrid() + `\n\nTime: ${elapsed}s`;
            scrollTerminalToBottom();
        }

        while (snakeActive && alive) {
            moveSnake();
            render();
            await new Promise(r => setTimeout(r, 300));
        }

        snakeActive = false;
        gameLine.innerHTML += `\nYou lasted ${Math.floor((Date.now() - startTime) / 1000)} seconds.`;
        await print("");
        scrollTerminalToBottom();
    }

    async function runLife() {
        await print("The grid awakens… something stirs in the void…", goldColor);
        await print("Life begins its dance.", goldColor);
        await print("");
        await new Promise(r => setTimeout(r, 500)); // brief pause before simulation

        const rows = 20;
        const cols = 40;
        let grid = Array.from({ length: rows }, () => Array(cols).fill(0));

        // Random initial state
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                grid[r][c] = Math.random() < 0.3 ? 1 : 0;
            }
        }

        const gameLine = document.createElement('div');
        gameLine.style.fontFamily = 'monospace';
        gameLine.style.whiteSpace = 'pre';
        gameLine.style.lineHeight = '0.8em';
        gameLine.style.letterSpacing = '0.1em';
        gameLine.style.color = sudoColor;
        output.appendChild(gameLine);

        function drawGrid() {
            let display = '';
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    display += grid[r][c] ? '■' : '·';
                }
                display += '\n';
            }
            return display;
        }

        function step() {
            const newGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    let neighbors = 0;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = r + dr;
                            const nc = c + dc;
                            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                                neighbors += grid[nr][nc];
                            }
                        }
                    }
                    if (grid[r][c] === 1) {
                        newGrid[r][c] = neighbors === 2 || neighbors === 3 ? 1 : 0;
                    } else {
                        newGrid[r][c] = neighbors === 3 ? 1 : 0;
                    }
                }
            }
            return newGrid;
        }

        function gridsEqual(g1, g2) {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (g1[r][c] !== g2[r][c]) return false;
                }
            }
            return true;
        }

        let running = true;
        const historyLength = 4; // remember last 4 steps
        let previousGrids = [JSON.parse(JSON.stringify(grid))];

        while (running) {
            gameLine.textContent = drawGrid();
            output.scrollTop = output.scrollHeight;

            const newGrid = step();

            // Check if newGrid matches any previous grid (oscillator detection)
            if (previousGrids.some(prev => gridsEqual(prev, newGrid))) {
                await print("\nGame stabilized or entered a short-period oscillator...", goldColor);
                await print("Simulation terminated.", goldColor);
                break;
            }

            previousGrids.push(JSON.parse(JSON.stringify(newGrid)));
            if (previousGrids.length > historyLength) previousGrids.shift();

            grid = newGrid;
            await new Promise(r => setTimeout(r, 300));
        }
    }

    helpBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await openTerminal();
    });

    input.addEventListener('input', () => {
        const cmd = input.value.trim().toLowerCase();
        // Check if command is in helpList, hiddenCommands, or is the special 'sudo override'
        if (helpList.includes(cmd) || hiddenCommands.includes(cmd) || cmd === 'sudo override') {
            input.style.color = redColor;
        } else {
            input.style.color = '';
        }
    });

    input.addEventListener('keydown', (e) => {
        if (snakeActive) {
            console.log(1);
            // handle snake controls
            switch (e.key) {
                case 'w': if (snakeDir.r !== 1) snakeDir = { r: -1, c: 0 }; break; // up
                case 'a': if (snakeDir.c !== 1) snakeDir = { r: 0, c: -1 }; break; // left
                case 's': if (snakeDir.r !== -1) snakeDir = { r: 1, c: 0 }; break; // down
                case 'd': if (snakeDir.c !== -1) snakeDir = { r: 0, c: 1 }; break; // right
                case 'Escape':
                    snakeActive = false;
                    break;
            }
            e.preventDefault(); // prevent cursor movement while playing
            return; // skip normal input handling
        }
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