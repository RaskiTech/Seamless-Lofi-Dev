import React, { Component } from 'react';
import './App.css';
import { LoadModel, Predict, GaussianRandomVector, GaussianRandomValue } from './Predict.js';
import './NoteVisualizer.js';
import NoteVisualizer from './NoteVisualizer.js';
import BeatManager from "./BeatManager.js"
import { rand, time } from '@tensorflow/tfjs';


const BPM = 100.0; // 100
const secondsPerBeat = 1.0 / (BPM / 60.0);

class Sequencer extends Component {

    constructor(props) {
        super(props);

        // State contains all the things that should update visuals
        this.state = {
            timeStep: -1, // Value between 0 and song length (in this case 64)
            model: {},
            loadedClips: {},
            noteTreshhold: 0.32,

            generatorArray: [],
            melodyNoteArray: [],
            nextMelodyNoteArray: [],
        }
        this.songIterationCount = 0;
        this.timeStepCallbackInterval = null;
        this.ambienceClipNames = {};
        this.beatManager = null;


        document.addEventListener('keydown', (e) => {
            if (e.key === 'a')
                this.PlayClip("kick");//addNote(this.IndexToPitch(32));
            if (e.key === 's')
                this.PlayClip("snare");//addNote(this.IndexToPitch(32 + 2));
            if (e.key === 'd')
                this.PlayClip("percussion");//addNote(this.IndexToPitch(32 + 4));
            if (e.key === 'f')
                this.PlayNote("midnight", this.IndexToPitch(41-7), 5);
            if (e.key === 'g')
                this.PlayNote("midnight", this.IndexToPitch(41-7 + 2), 5);
            if (e.key === 'h')
                this.PlayNote("soundTest", this.IndexToPitch(41-7 + 4), 5);
            if (e.key === 'j')
                this.PlayNote("soundTest", this.IndexToPitch(41-7 + 5), 5);
            if (e.key === 'k')
                this.PlayNote("soundTest", this.IndexToPitch(41-7 + 7), 5);
            if (e.key === 'l')
                this.PlayNote("soundTest", this.IndexToPitch(41-7 + 12), 5);
            if (e.key === 'ö')
                this.PlayNote("soundTest", this.IndexToPitch(41-7 - 12), 5);
        })
    }

    async AudioStreamStarted() {
        this.LoadAmbienceClip("rain", "Clips/AmbianceRain.wav",         0);
        this.LoadAmbienceClip("waves", "Clips/AmbianceWaves.wav",       1);
        this.LoadAmbienceClip("birds", "Clips/AmbianceBirds.wav",       2);
        this.LoadAmbienceClip("crickets", "Clips/AmbianceCrickets.wav", 3);
        this.LoadAmbienceClip("cafe", "Clips/AmbianceCafe.wav",         4);
        this.beatManager = new BeatManager();

        this.props.nodeRef.port.postMessage({
            type: "volume",
            value: this.props.volume,
        });

        this.GenerateNewMelody();
    }

    StartedPlaying() {
        const ambienceVol = 0.4; // 0.5

        this.ChangeToRandomAmbienceClips();
    }
    StoppedPlaying() {
        Object.keys(this.ambienceClipNames).forEach(key => {
            this.props.nodeRef.port.postMessage({type: "changeAmbienceVolume", index: this.ambienceClipNames[key], volume: 0.0});
        })
    }

    componentDidUpdate(prevProps) {
        if (this.props.nodeRef === null)
            return;
        if (prevProps.nodeRef === null)
            this.AudioStreamStarted();

        // Play & Pause
        if (this.props.play !== prevProps.play) {
            if (this.props.play) {
                this.StartedPlaying();
                if (this.timeStepCallbackInterval === null)
                    this.timeStepCallbackInterval = setInterval(() => this.AdvanceTimeStep(), 1000 * secondsPerBeat);
            }
            else {
                this.StoppedPlaying();
                if (this.timeStepCallbackInterval !== null)
                    clearInterval(this.timeStepCallbackInterval);
                this.timeStepCallbackInterval = null;
            }
        }

        if (this.props.volume != prevProps.volume) {
            this.props.nodeRef.port.postMessage({
                type: "volume",
                value: this.props.volume,
            });
        }
    }

    componentWillUnmount() {
        if (this.props.play)
            this.StoppedPlaying();
        if (this.timeStepCallbackInterval !== null)
            clearInterval(this.timeStepCallbackInterval);

        // This is for code reloads sake.
        this.props.ResetAudio();
    }

    async LoadAmbienceClip(key, path, loadIndex) {
        this.ambienceClipNames[key] = loadIndex;

        var audioContext = new AudioContext();
        var reader = new FileReader();
        var getThis = () => { return this; };

        reader.onload = async function() {
            var arrayBuffer = reader.result;
            var decoded = await audioContext.decodeAudioData(arrayBuffer);

            getThis().props.nodeRef.port.postMessage(
                {
                    type: "loadAmbienceClip",
                    index: loadIndex,
                    sampleRate: decoded.sampleRate,
                    sampleBuffer: decoded.getChannelData(0),
                }
            )
        };

        var response = await fetch(path);
        var blob = await response.blob();
        reader.readAsArrayBuffer(blob);
    }
    ChangeToRandomAmbienceClips() {
        const ambienceVol = 0.4;
        const possibilities = [
            {
                "rain":     ambienceVol * 0,
                "birds":    ambienceVol * 1.5,
                "waves":    ambienceVol * 0,
                "crickets": ambienceVol * 0,
                "cafe":     ambienceVol * 0,
            },
            {
                "rain":     ambienceVol * 1.5,
                "birds":    ambienceVol * 0,
                "waves":    ambienceVol * 0,
                "crickets": ambienceVol * 0,
                "cafe":     ambienceVol * 0.75,
            },
        ]

        this.ChangeAmbienceClips(possibilities[Math.floor(Math.random() * possibilities.length)], 5.0);

    }
    async ChangeAmbienceClips(keyVolumePairs, duration)
    {
        const smoothStepCount = 10;
        if (this.currentKeyVolumePairs === undefined) {
            this.currentKeyVolumePairs = {};
        }
        
        var millisecondWaitTime = duration / smoothStepCount * 1000;
        for (var i = 0; i < smoothStepCount; i++)
        {

            var percent = (i + 1) / smoothStepCount;
            console.log("New:", percent, "percent");
            for (const [key, volume] of Object.entries(keyVolumePairs))
            {
                if (this.currentKeyVolumePairs[key] === undefined)
                    this.currentKeyVolumePairs[key] = 0;

                var newVolume = percent * volume + (1 - percent) * this.currentKeyVolumePairs[key];
                this.props.nodeRef.port.postMessage({type: "changeAmbienceVolume", index: this.ambienceClipNames[key], volume: newVolume});
            }


            await new Promise(r => setTimeout(r, millisecondWaitTime))
        }


    }


    async GenerateNewMelody() {
        var arr, vec;
        do {
            vec = GaussianRandomVector(0, 1);
            arr = await Predict(this.state.model, vec);

        } while (!this.IsAcceptableMelody(arr));   

        this.setState({
            melodyNoteArray: arr,
            generatorArray: vec,
        });

        this.state.generatorArray = vec; // Update this for this frame also, because it will be used in the next function

        this.GenerateModifiedMelody(false);
    }
    async GenerateModifiedMelody(checkAcceptableMelody = true) {
        if (this.props.melodyChangeSpeed === 0)
            return;

        var vec = this.state.generatorArray;
        const changeAmount = this.props.melodyChangeSpeed * 2;

        for (var i = 0; i < changeAmount; i++) {
            var randIndex = Math.floor(Math.random() * vec.length)

            vec[randIndex] = GaussianRandomValue(0, 1);
        }

        var arr = await Predict(this.state.model, vec);
        this.setState({
            nextMelodyNoteArray: arr,
            generatorArray: vec,
        });

        if (checkAcceptableMelody && !this.IsAcceptableMelody(arr))
            this.GenerateNewMelody();
    }

    // Check if the melody has outrageous gaps in it
    IsAcceptableMelody(melodyArray) {

        const gapLenth = 4;

        let curLength = 0;
        for (var i = 0; i < melodyArray.length; i++) {
            if (!this.DoesArrayContainBiggerThan(melodyArray[i], this.state.noteTreshhold))
                curLength++;
            else
                curLength = 0;
            
            if (curLength == gapLenth) {
                return false;
            }
        }

        return true;
    }

    DoesArrayContainBiggerThan(array, value) {
        for (var i = 0; i < array.length; i++)
            if (array[i] > value)
                return true;
        return false;
    }

    SwapMelodyBuffers() {
        if (this.state.nextMelodyNoteArray.length === 0)
            return;

        this.setState({
            melodyNoteArray: this.state.nextMelodyNoteArray,
            nextMelodyNoteArray: [],
        })
    }


    // Converts melodyNoteArray index to hz.
    IndexToPitch(index) {
        const lowestNote = 41.20; // E1. The max is G#6. Could try 55.00 which is A1 to C7
        const twoToPowerOneTwelfth = 1.05946398436;
        return lowestNote * Math.pow(twoToPowerOneTwelfth, index);
    }

    PlayClip(name) {
        if (!this.state.loadedClips.hasOwnProperty(name)) {
            console.error("Clip", name, "isn't loaded. Check the spelling.");
            return;
        }


        var clip = this.state.loadedClips[name];
        this.props.nodeRef.port.postMessage(
            {
                type: "addClip",
                startTime: 0.0,
                sampleRate: clip.sampleRate,
                sampleBuffer: clip.sampleBuffer,
            }
        );
    }

    PlayNote(instrumentName, pitch, duration, startTime=0.0, volume=1.0) {
        this.props.nodeRef.port.postMessage(
            {
                type: "addNote",
                instrument: instrumentName,
                pitch: pitch,
                startTime: startTime,
                releaseTime: duration + startTime,
                volume: volume,
            }
        );
    }

    SendMelodyNotes(timeStep) {
        for (var i = 0; i < this.state.melodyNoteArray[timeStep].length; i++) {
            var wasOnLastTime = timeStep > 0 && this.state.melodyNoteArray[timeStep - 1][i] > this.state.noteTreshhold;
            var onNow = this.state.melodyNoteArray[timeStep][i] > this.state.noteTreshhold;

            if (!wasOnLastTime && onNow) {
                var endStep = timeStep + 1;
                while (endStep < this.state.melodyNoteArray.length) {
                    if (!(this.state.melodyNoteArray[endStep][i] > this.state.noteTreshhold))
                        break;
                    endStep++;
                }

                const timeStepCount = endStep - timeStep; // Perhaps make all notes play a step or two longer
                this.PlayNote("electric", this.IndexToPitch(i), timeStepCount * secondsPerBeat, 0.0, 0.7);

            }
        }
    }
    AdvanceBeat(timeStep) {
        const AdvanceBeat = () => {
            this.beatManager.AdvanceStep();
            var clip = this.beatManager.GetNowStartingClip();
            if (clip !== null)
                this.props.nodeRef.port.postMessage({
                    type: "addClip",
                    startTime: 0.0,
                    volume: clip.volume,
                    sampleRate: clip.sampleRate,
                    sampleBuffer: clip.sampleBuffer,
                })
        }

        // We don't want beats at the first loop
        if (this.songIterationCount > 0 || timeStep > 31) {
            AdvanceBeat();
            setTimeout(AdvanceBeat, secondsPerBeat / 2.0 * 1000);
        }

    }
    PlayBase(timeStep) {
        const BaseNoteDuration = 8;
        if (timeStep % BaseNoteDuration === 0) {
            var baseNoteIndex = this.GetBaseNoteOfMeasure(timeStep / BaseNoteDuration, BaseNoteDuration);
            baseNoteIndex = baseNoteIndex - 12;
            if (baseNoteIndex !== -1) {
                this.PlayNote("midnight", this.IndexToPitch(baseNoteIndex),      BaseNoteDuration * secondsPerBeat, 0.0, 2.0);
                this.PlayNote("midnight", this.IndexToPitch(baseNoteIndex + 7),  BaseNoteDuration * secondsPerBeat, 0.2, 1.4);
                this.PlayNote("midnight", this.IndexToPitch(baseNoteIndex + 12), BaseNoteDuration * secondsPerBeat, 0.4, 1.0);
            }

        }
    }
    PlayNoise(timeStep) {
        const before = 3;
        const isBeatStarting = this.songIterationCount === 0 && (timeStep + before) === 32;
        if ((timeStep + before) === 64 || isBeatStarting) {
            this.PlayNote("noise", 0, before * secondsPerBeat, 0);
        }
    }

    AdvanceTimeStep() {

        var timeStep = this.state.timeStep + 1;
        if (timeStep >= this.state.melodyNoteArray.length) {
            timeStep = 0
            this.songIterationCount++;
        }
        this.setState({timeStep: timeStep});

        if (timeStep === 0)
            this.GenerateModifiedMelody();
        if (timeStep === 63)
            this.SwapMelodyBuffers();


        this.SendMelodyNotes(timeStep);
        this.AdvanceBeat(timeStep);
        this.PlayBase(timeStep);

        this.PlayNoise(timeStep);

        if (timeStep === 63 && Math.random() > 0.5)
            this.ChangeToRandomAmbienceClips();
    }

    GetBaseNoteOfMeasure(measureIndex, BaseNoteDuration) {
        // Let's test the first one that plays, if multiple play, select the lowest.

        var note = -1;
        var timeStep = measureIndex * 8;
        for (; timeStep < measureIndex * 8 + BaseNoteDuration; timeStep++) {
            for (var i = 0; i < this.state.melodyNoteArray[timeStep].length; i++) {
                if (this.state.melodyNoteArray[timeStep][i] > this.state.noteTreshhold) {
                    note = i;
                    return note;
                }
            }
            timeStep++;
        }

        return note;
    }

    render() {
        if (Object.keys(this.state.model).length === 0)
            LoadModel(this.state);

        return (
            <>
                <NoteVisualizer notes={this.state.melodyNoteArray} noteTreshhold={this.state.noteTreshhold} timeStep={this.state.timeStep + 1}></NoteVisualizer>
                <button className="footnote" disabled={this.props.nodeRef === null} onClick={this.GenerateNewMelody.bind(this)}>{this.props.nodeRef === null ? "" : "Get a new song"}</button>
            </>
        )
    }
}


export default Sequencer;