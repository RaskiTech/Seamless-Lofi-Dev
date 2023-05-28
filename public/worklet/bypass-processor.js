/**
 * @class BypassProcessor
 * @extends AudioWorkletProcessor
 */
import { GetWaveAtTime, SoundAction, ResetAudioData } from './MusicPlayer.js';

const sampleRate = 44100;
const VERBOSE = false;

class BypassProcessor extends AudioWorkletProcessor {
    phase = 0;
    isPlaying;
    callback;

    constructor() {
        super();
        this.isPlaying = false;
        this.port.onmessage = this.onmessage.bind(this);
        ResetAudioData();
    }

    onmessage(event) {
        const { data } = event;

        if (VERBOSE)
            console.log("Event", data);
        
        if (data.play !== undefined) {
            this.isPlaying = data.play;
            return
        }

        // Convert times from relative to absolute
        if (data.startTime   !== undefined)
            data.startTime   += (this.phase / sampleRate)
        if (data.releaseTime !== undefined)
            data.releaseTime += (this.phase / sampleRate)
        
        SoundAction(data)
    }

    process(inputs, outputs, params) {
        var verbose = VERBOSE && this.phase % 10000 === 0;

        if(!this.isPlaying) {
            return true;
        }

        const output = outputs[0];

        for (var i = 0; i < output[0].length; i++) {
            const time = (i+this.phase) / sampleRate;
            var leftRight = GetWaveAtTime(time, verbose && i == 0);
            output[0][i] = leftRight[0]
            output[1][i] = leftRight[1]
        }
        this.phase += output[0].length; 

        if (verbose)
            console.log("Out:", outputs[0][0][0], "Playing:", this.isPlaying);

        if (outputs[0][0][0] === NaN)
            console.log("Audio is NaN");
        else if (outputs[0][0][0] > 1)
            console.log("Sent audio is over 1. Consider lowerind some volumes.");

        return this.isPlaying;
    }
}

registerProcessor('bypass-processor', BypassProcessor);