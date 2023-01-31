const audioContext = new AudioContext();
const badKeys = ["Alt","Arrow","Audio","Enter","Launch","Meta","Play","Tab"];
const emptyLine = " ".repeat(128 + 4);
const fileInput = byId("fileInput");
const gainNode = new GainNode(audioContext);
const oscillator = new OscillatorNode(audioContext, {frequency: 0});
const reader = new FileReader();
const select = byId("track");
const value = {"c":0,"d":2,"e":4,"f":5,"g":7,"a":9,"b":11,"#":1,"&":-1};
const width = 128 + 4 + 1;

let activePress; let frequencies; let index; let indents; let midi; 
let normalGain; let notes; let octave; let on = false; let paused; let press; 
let track; let tuning;

oscillator.connect(gainNode).connect(audioContext.destination); resetVars();

function byId(id) { return document.getElementById(id); };

function toFreq(note) {
    return tuning.frequency * 2**((note.pitch - tuning.pitch)/12 
        + note.octave - tuning.octave);
}

function convertNotesToFrequencies() {
    octave = 4;
    for (let i = 0; i < notes.length; i++) {
        const note = unbundle(notes[i]); notes[i] = note.text;
        frequencies.push(toFreq(note));
        const indent = note.pitch + (note.octave + 1) * 12;
        indents.push(indent);
    } 
}

function down(e) {
    e.preventDefault();
    const strPress = "" + press;
    if (on && !badKeys.some(badKey => strPress.includes(badKey)) && !paused
        && (index < frequencies.length) && !e.repeat && (press != activePress)
        && (document.activeElement.nodeName !== 'INPUT')) {
        if (activePress === null) {
            oscillator.frequency.value = frequencies[index];
            gainNode.gain.setTargetAtTime(normalGain, 
                audioContext.currentTime, 0.015);
        } else {
            oscillator.frequency.setTargetAtTime(frequencies[index], 
                audioContext.currentTime, 0.003)    
        }
        activePress = press; index++;
    }
}

function format(x) {return x.trim().toLowerCase();}

function key(e) { 
    if (e.type.includes("key")) {press = e.key;} 
    else {press = e.changedTouches[0].identifier;}
    if (["keydown","touchstart"].includes(e.type)) {down(e);} else {up(e);}
}

function pause() { paused = true; oscillator.frequency.value = 0; }

function resetVars() {
    activePress = null; frequencies = []; index = 0; indents = []; octave = 4; 
    paused = false;
    tuning = unbundle(byId("tuningNote").value);
    tuning.frequency = +byId("tuningFrequency").value;
    if (byId("fileRadio").checked) {
        track = select.selectedIndex;
        notes = midi.tracks[track].notes.map(x => format(x.name));
    } else {
        notes = format(byId("notes").value).split(/\s+/);
        midi = new Midi();
        const track = midi.addTrack();
        for (let i = 0; i < notes.length; i++) {
            track.addNote({ name: notes[0] });
        }
    }
    const proposedGain = +byId("gain").value;
    if (proposedGain <= 1 && proposedGain >= 0) {normalGain = proposedGain;} 
    else {normalGain = 0.15;}
    gainNode.gain.value = 0;
}

function resume() { paused = false; }

function start() { 
    window.setTimeout(() => {
        resetVars(); convertNotesToFrequencies();
        if (!on) {oscillator.start(); on = true;}
    });
}

function unbundle(note) {
    let text = format(note); note = text.split('');
    if (+note.at(-1)) {octave = +note.pop();} else {text += octave;}
    let pitch = 0; while (note.length) { pitch += value[note.pop()]; }
    return {pitch:pitch, octave:octave, text:text};
}

function up(e) {
    if (on && (press === activePress)) {
        gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.015);
        activePress = null;
    }
}

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0]; if (file) {reader.readAsArrayBuffer(file);}
});
reader.addEventListener("load", (e) => {
    midi = new Midi(e.target.result);
    while (select.options.length) {select.options.remove(0);}
    for (let i = 0; i < midi.tracks.length; i++) {
        const option = document.createElement("option");
        option.text = midi.tracks[i].name; select.add(option);
    }
});
const touchstart = (e) => {keydown(e);}; const touchend = (e) => {keyup(e);};
const buttonFuncs = [start,pause,resume];
const docEventTypes = ["keydown","keyup","touchstart","touchend"];
for (f of buttonFuncs) {byId(f.name).addEventListener("click", f);} 
for (et of docEventTypes) {document.addEventListener(et, key);}