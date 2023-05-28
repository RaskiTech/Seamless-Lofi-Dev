const TAU = 2 * Math.PI;
const twoOverPI = 2.0 / Math.PI;
const halfPI = Math.PI / 2;

const instruments = {
    "synth": {
        waveFunction: GetSynthWave,
    },
    "soundTest": {
        waveFunction: GetSoundTest,
    },
    "midnight": {
        waveFunction: GetMidnightSound,
    },
    "electric": {
        waveFunction: GetElectricSynth,
    },
    "noise": {
        waveFunction: GetNoise,
    },
};

// Note should contain:
// instrument: string
// pitch: number
// activateTime: number 
// releaseTime: number
let notes;
let noteIndex;
// Clip should contain:
// sampleBuffer
// time
// sampleRate
let clips;
let clipIndex;

let masterVolume = 0.8;

// These clips are loaded at the start and stay loaded. Primarely used for ambience
// Looping clips should contain:
// volume: 0 if not playing
// time
// sampleRate
// sampleBuffer
let ambienceClips;

export function ResetAudioData() { 
    notes = new Array(30); 
    noteIndex = 0;
    clips = new Array(20); 
    clipIndex = 0;
    ambienceClips = new Array(5);
}

/* #region waveMath */

function DontCrackOnMe(time, endTime, attackTime=0.025, releaseTime=0.025) {
    if (time > endTime)
        return 0;
    if (time < attackTime) {
        if (time < 0)
            return 0;
        return time / attackTime;
    }
    if (time + releaseTime > endTime) {
        return (endTime - time) / releaseTime;
    }
    return 1;
}

var lastRand = 0;
// EndTime is the loudest time
function GetNoise(playedTime, endTime, pitch) {
    const dropoffDuration = 15.0;

    var volume = 0;
    if (playedTime > 0)
    {
        if (playedTime > endTime) {
            if (playedTime - dropoffDuration < endTime)
                volume = Math.exp(-(5/dropoffDuration) * playedTime);
        }
        else {
            var risePercentage = playedTime / endTime;
            volume = 0.75 * risePercentage * risePercentage;
        }
    }
    if (volume === 0)
        return [0, 0];

    var rand = Math.random();
    var wave = rand - lastRand;
    lastRand = rand;

    wave *= volume;
    return [wave, wave];
}

function GetOscillatorWave(playedTime, endTime, pitch) {
    const falloffTime = 0.3;
    
    var hz = pitch * TAU;

    var wave = 0;

    wave += 0.6  * Math.sin(1 * playedTime * hz);
    wave += 0.2  * Math.sin(2 * playedTime * hz);
    wave += 0.05 * Math.sin(4 * playedTime * hz);
    wave *=  Math.exp(-0.0025 * playedTime * hz);
    wave += wave * wave * wave;

    wave *= DontCrackOnMe(playedTime, endTime, 0.1, 0.1);
    return [wave, wave];
}

function GetSoundTest(playedTime, endTime, pitch) {
    var wave = 0;
    var hz = pitch * TAU;
    
    wave = Math.sin(hz * playedTime);

    wave += 0.5 * Math.sin(0.5 * hz * playedTime - 7);
    wave += 0.5 * Math.sin(0.5 * hz * playedTime + 7);

    wave *= 0.5 * DontCrackOnMe(playedTime, endTime, 2, 2);

    return [wave, wave];
}

function GetSynthWave(playedTime, endTime, pitch) {

    if (playedTime > endTime)
        return [0, 0];

    var GetAmplitudeModification = (index, offset) => { return 1 + 0.5 * Math.sin(offset + playedTime * 5 * Math.pow(index, 2)) }
    // offset: Random value to separate different detune function calls
    var GetDetune = (offset) => { return 1; }//return 1 + 0.001 * Math.sin(playedTime * 3 + offset) }

    var GetSpeakerWave = (offset, time, pitch) => {
        var x = time * pitch;
        var f0 = 367279531.39014554 * Math.sin(439.875 * x * GetDetune(offset + 1));
        var f1 = 154510689.27153534 * Math.sin(880.125 * x * GetDetune(offset + 2));
        var f2 = 73891115.6011831 * Math.sin(1320.0 * x * GetDetune(offset + 3));
        var f3 = 19457265.59190379 * Math.sin(1759.875 * x * GetDetune(offset + 4));
        var f4 = 6808778.204142964 * Math.sin(2200.125 * x * GetDetune(offset + 5));
        var f5 = 2219744.06597633 * Math.sin(2640.0 * x * GetDetune(offset + 6));


        var wave = f0 * GetAmplitudeModification(1.0, offset) +
                   f1 * GetAmplitudeModification(2.1, offset) +
                   f2 * GetAmplitudeModification(3.3, offset) +
                   f3 * GetAmplitudeModification(4.1, offset) +
                   f4 * GetAmplitudeModification(5.5, offset) +
                   f5 * GetAmplitudeModification(6.2, offset);
        return wave;
    }

    // The weird pitch this function uses
    var functionPitch = 1.85 * 3.14159 * pitch / 440;

    var left = GetSpeakerWave(0, playedTime, functionPitch) + GetSpeakerWave(10, playedTime, functionPitch * 1.01);
    var right = GetSpeakerWave(23, playedTime, functionPitch) + GetSpeakerWave(12.3, playedTime, functionPitch * 1.01);

    var loudness = 0.0000000005 * 
        /* Attack */ (3 * Math.exp(-10 * playedTime) + 1);
    loudness *= DontCrackOnMe(playedTime, endTime, 0.01, 0.01);
    
    left *= loudness * (1 + 0.2 * Math.sin(         playedTime * 60))
    right *= loudness * (1 + 0.2 * Math.sin(3.141 + playedTime * 60))

    return [left, right];
}

function GetMidnightSound(playTime, endTime, pitch) {
    if (playTime < 0)
        return [0, 0];

    var hz = pitch * TAU;

    var wave = Math.sin(playTime * hz);
    
    const interval = 0.6;
    const repeatFalloff = 0.5;

    var n = 30; // Higher n => sharper sawtooth peaks
    var x = (playTime * 2 / interval) % 2 - 1;
    var smoothSawtooth = (-x * (1 - Math.pow(x, 2 * n)) + 1) / 2;
    var volume = Math.exp(-repeatFalloff * playTime) * smoothSawtooth;

    wave *= volume;

    // Falloff
    const releaseTime = 0.1
    if (playTime > endTime)
        wave *= 0;
    if (playTime + releaseTime > endTime) {
        wave *= (endTime - playTime) / releaseTime;
    }

    wave *= 1.0;

    //wave *= DontCrackOnMe(playTime, endTime, 0.01, 0.01)
    return [wave, wave];
}

function GetElectricSynth(playTime, endTime, pitch) {
    var hz = pitch * TAU;

    var f1v = 2.8163;
    var f2v = 1.1698;
    var f3v = 0.37175;
    var f4v = 0.005;
    var f5v = 0.009;
    var f6v = 0.005;

    var wave = 0;
    wave += f1v * Math.sin(1 * hz * playTime);
    wave += f2v * Math.sin(2 * hz * playTime);
    wave += f3v * Math.sin(3 * hz * playTime);
    wave += f4v * Math.sin(4 * hz * playTime);
    wave += f5v * Math.sin(5 * hz * playTime);
    wave += f6v * Math.sin(6 * hz * playTime);
    wave = wave * wave + 3 * wave;

    // Velocity
    var clampedTime = Math.min(playTime, endTime)

    var velocity = 0.1;
    velocity *= Math.exp(clampedTime * -0.7) + 0.2;
    var velocityLeft = velocity + 0.01 * Math.sin(clampedTime * 20);
    var velocityRight = velocity + 0.01 * Math.sin(3.14159 + clampedTime * 20);

    // Make high pitch sounds a little quieter
    velocityLeft  /= pitch * 0.01;
    velocityRight /= pitch * 0.01;

    if (playTime > endTime) {
        var releaseVelocity = Math.exp((playTime - endTime) * -2);
        velocityLeft  *= releaseVelocity;
        velocityRight *= releaseVelocity;

    }

    const attackTime = 0.02;
    if (playTime < attackTime)
        wave *= playTime / attackTime;
    return [wave * velocityLeft, wave * velocityRight]
}

/* #endregion */


function GetInstrumentSound(instrument, note, time, verbose) {
    // Get waveform of instrumet
    // Modify it with attack, release and sustain

    var sound = instrument.waveFunction(time - note.activateTime, note.releaseTime - note.activateTime, note.pitch)

    if (verbose) {
        if (sound[0] > 1 || sound[0] < -1 || sound[1] > 1 || sound[1] < -1)
            console.log("Sound wave in instrument", instrument.waveFunction.name, "was over range of [-1, 1]. It is", sound);

        console.log("Time:", time, "Note:", note, "Sound:", sound);
    }

    sound[0] *= note.volume;
    sound[1] *= note.volume;
    return sound;
}
function GetClipSound(absTime, clip, verbose) {
    var sound = 0;

    var clipLength = clip.sampleBuffer.length / clip.sampleRate;
    if (clip.time < absTime && absTime < clip.time + clipLength) {
        sound += clip.sampleBuffer[Math.floor(clip.sampleRate * (absTime - clip.time))];
        if (verbose && sound === NaN) {
            console.log("Warning at time", absTime, "when clip was active from time", clip.time, "and had sample rate of", clip.sampleRate);
            console.log("Sound became NaN. Sound that was added was", clip.sampleBuffer[Math.floor(clip.sampleRate * (absTime - clip.time))], "- It is at index", Math.floor(clip.sampleRate * (absTime - clip.time)), "in buffer", clip.sampleBuffer);
        }

        sound *= clip.volume;
        sound *= DontCrackOnMe(absTime - clip.time, clipLength, 0.01, 0.05);
    }


    return [sound, sound];
}
function GetAmbientClipSound(time, clip, verbose) {
    var clipLength = clip.sampleBuffer.length / clip.sampleRate;
    var sound = clip.volume * clip.sampleBuffer[Math.floor(clip.sampleRate * (time % clipLength))];

    return [sound, sound];
}

export function SoundAction(event) {
    switch (event.type) {
        case "addNote":
            notes[noteIndex] = {
                instrument: event.instrument,
                pitch: event.pitch,
                activateTime: event.startTime,
                releaseTime: event.releaseTime,
                volume: event.volume,
            };

            noteIndex = (noteIndex + 1) % notes.length;
            break;
        case "addClip":
            clips[clipIndex] = {
                time: event.startTime,
                sampleBuffer: event.sampleBuffer,
                sampleRate: event.sampleRate,
                volume: event.volume,
            };

            clipIndex = (clipIndex + 1) % clips.length;
            break;
        case "changeAmbienceVolume":
            ambienceClips[event.index].volume = event.volume;
            break;
        case "loadAmbienceClip":
            if (ambienceClips.length <= event.index)
                console.error("Ambience clip buffer too small. Tried to insert to position", event.index, "It can be increased in MusicPlayer.js");
            
            ambienceClips[event.index] = {
                time: 0,
                volume: 0,
                sampleRate: event.sampleRate,
                sampleBuffer: event.sampleBuffer,
            }
            break;
        case "volume":
            masterVolume = event.value;
            break;
        default:
            console.error("Clip type in event", event, "not recognized.");
    }
}

export function GetWaveAtTime(time, verbose) {
    var output = [0.0, 0.0];

    for (var i in notes) {
        let instrument = instruments[notes[i].instrument];
        if (instrument === undefined) {
            if (verbose)
                console.log("Couldn't find instrument in note: ", notes[i]);
            continue;
        }
        var out = GetInstrumentSound(instrument, notes[i], time, verbose);
        output[0] += out[0];
        output[1] += out[1];
    }
    for (var i in clips) {
        var out = GetClipSound(time, clips[i], verbose)
        if (verbose)
            console.log("Out came ", out);
        output[0] += out[0];
        output[1] += out[1];
    }
    for (var i in ambienceClips) {
        var out = GetAmbientClipSound(time, ambienceClips[i], verbose);
        output[0] += out[0];
        output[1] += out[1];
    }

    // Force a reduction because it likely is over anyway
    var loudness = 0.18 * masterVolume;
    output[0] *= loudness;
    output[1] *= loudness;

    if (verbose && output > 1)
        console.log("Final output was over 1, meaning the speaker will likely crack. Output was ", output);


    return output; 
}
