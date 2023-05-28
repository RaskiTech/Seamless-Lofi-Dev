import React, { Component, useState, useRef, useEffect } from 'react';
import './App.css';
import './Cards.css';
import { LoadModel, Predict, GaussianRandomVector } from './Predict';
import Sequencer from './Sequencer';
import SettingsMenu from './SettingsMenu';


const InitializeAudioWorklet = async (audioContext) => {
    const processorModuleName = "bypass-processor";
    try
    {
        await audioContext.audioWorklet.addModule(`worklet/${processorModuleName}.js`);
        const node = new AudioWorkletNode(audioContext, processorModuleName, {channelCount: 2, channelCountMode: "explicit"});
        //const oscillator = audioContext.createOscillator();
        //oscillator.connect(node).connect(audioContext.destination);
        //oscillator.start();
        node.connect(audioContext.destination)

        return node;
    }
    catch(e)
    {
        console.log(`Failed to load module ${processorModuleName}. Error: \n`, e);
    }
}

function App() {
    const [isPlaying, setIsPlayingState] = useState(false);
    const audioContext = useRef(null);
    const [nodeRef, setNodeRef] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [changeSpeed, setChangeSpeed] = useState(2);

    const StartAudioStream = async () =>
    {
        if (!audioContext.current) {
            try { audioContext.current = new (window.AudioContext || window.webkitAudioContext)(); }
            catch(e)
            {
                console.log(`Sorry, but your browser doesn't support the Web Audio API!`, e);
                return;
            }
        } 

        if (nodeRef === null)
        {
            var bindFunc = async () => {
                var newNodeRef = await InitializeAudioWorklet(audioContext.current);
                newNodeRef.port.postMessage({play: true});
                setNodeRef(newNodeRef);
            }
            bindFunc();
        }

    }

    const SetIsPlaying = (playing) => {
        setIsPlayingState(playing);
        nodeRef.port.postMessage({play: playing});
    }

    const ResetAudio = () => {
        if (nodeRef !== null) {
            SetIsPlaying(false);
            nodeRef.port.onmessage = null;
            nodeRef.port.close();
            setNodeRef(null);
        }
    }

    const MiddleButtonPress = () => {
        if (nodeRef === null)
            StartAudioStream();
        else
            SetIsPlaying(!isPlaying);
    }
    const settingsButtonClicked = () => {
        setSettingsOpen(!settingsOpen);
    }

    return (
        <>
            <div className="card-parent top-left-cards">
                <div className="card"><p>SEAMLESS</p><p>Lofi Generator</p></div>
                <button className="card" onClick={settingsButtonClicked}>Settings</button>
            </div>
            <div className="card-parent top-right-cards">
                <div className="card">RaskiTech</div>
                <div className="card"></div>
                <div className="card"></div>
            </div>
            <SettingsMenu open={settingsOpen} defaultVolume={volume} defaultSpeed={changeSpeed} onSpeedChange={setChangeSpeed} onVolumeChange={setVolume}/>

            <header className="App-header">

                <button className={"playButton " + (nodeRef === null ? "playButtonInitialize " : "") + (isPlaying ? "playButtonActive " : "playButtonPause")} onClick={MiddleButtonPress}>{nodeRef === null ? "Initialize" : ""}</button>
                <span className="subText">Use AI to generate never-ending beats to *relax and study to*</span>
                <Sequencer nodeRef={nodeRef} play={isPlaying} volume={volume} melodyChangeSpeed={changeSpeed} ResetAudio={ResetAudio}/>

            </header>
        </>
    );
}

export default App;