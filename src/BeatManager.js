
// Contains all possible beat patterns. Could also make connection patterns that would play between these patterns.
// One beat pattern is an array of timesteps where each timestep is a number. -1 is nothing, 0 is kick, 1 is clap, 2 is hithat, 3 is percussion, 4 is crash
const BeatPatterns = [
    [ 0, -1, 2, -1, 2, -1, 2, -1,   0, 3, 2, -1, 2, -1, 2, 0,   0, -1, 2, -1, 2, -1, 2, 3,   0, -1, 2, -1, 2, -1, 2, -1],


    [ 0, -1, 2, -1,  1, 3, 2, 0,  0, -1, 2, 3,  1, -1, 2, -1 ],

]

// Sample paths and volumes
const Samples = {
    "kicks": [["Clips/Kick1.wav", 5.0], ["Clips/Kick2.wav", 5.0]],
    "claps": [["Clips/Clap1.wav", 2.0], ["Clips/Clap3.wav", 2.0], ["Clips/Clap4.wav", 2.0], ["Clips/Clap6.wav", 2.0]],
    "hithats": [["Clips/Hithat3.wav", 1.0], ["Clips/Hithat4.wav", 1.0]],
    "percussion": [["Clips/Percussion1.wav", 1.5], ["Clips/Percussion2.wav", 1.5], ["Clips/Percussion4.wav", 1.5], ["Clips/Percussion5.wav", 1.5]],
    "crashes": [["Clips/Crash2.wav", 2.0], ["Clips/Crash4.wav", 2.0]],
}
const GetRandomSample = (type) => { return Samples[type][Math.floor(Math.random() * Samples[type].length)]; }


class BeatManager {
    constructor() {
        this.clips = new Array(5);
        this.pattern = [];
        this.timeStep = -1;

        //this.pattern = BeatPatterns[Math.floor(Math.random() * BeatPatterns.length)];
        this.pattern = BeatPatterns[0];
        
        this.LoadClip(0, GetRandomSample("kicks"));
        this.LoadClip(1, GetRandomSample("claps"));
        this.LoadClip(2, GetRandomSample("hithats"));
        this.LoadClip(3, GetRandomSample("percussion"));
        this.LoadClip(4, GetRandomSample("crashes"));


    }

    AdvanceStep() {
        this.timeStep = (this.timeStep + 1) % this.pattern.length;
    }

    GetNowStartingClip() {
        if (this.timeStep === -1)
            return null;

        var index = this.pattern[this.timeStep];
        if (index === -1)
            return null;
        
        return this.clips[index];
    }

    async LoadClip(typeIndex, sample) {
        var path = sample[0];
        var volume = sample[1];

        var audioContext = new AudioContext();
        var reader = new FileReader();

        console.log("Loading " + path + " to drums.");

        var getContext = () => { return this; };

        reader.onload = async function() {
            var arrayBuffer = reader.result;
            var decoded = await audioContext.decodeAudioData(arrayBuffer);

            getContext().clips[typeIndex] = {
                sampleRate: decoded.sampleRate,
                sampleBuffer: decoded.getChannelData(0),
                volume: volume,
            };
        };

        var response = await fetch(path);
        var blob = await response.blob();
        reader.readAsArrayBuffer(blob);
    }
};

export default BeatManager;