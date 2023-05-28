import react, { useState } from 'react';
import './settings.css';


function SettingsMenu(props) {
    const [volume, setVolume] = useState(0.8);

    
    return (
        <div className={"settingsContainer " + (props.open ? "settingsOpen" : "settingsClosed")}>
            <p>Volume</p>
            <div className="sliderFrame">
                <input disabled={!props.open} type="range" min="0" max="1" step="0.05" defaultValue={props.defaultVolume} onChange={(event) => props.onVolumeChange(event.target.value)}/>
            </div>

            <p>Changing speed</p>
            <div className="sliderFrame">
                <input disabled={!props.open} type="range" min="0" max="5" step="1" defaultValue={props.defaultSpeed} onChange={(event) => props.onSpeedChange(event.target.value)}/>
            </div>
        </div>
    )
}

export default SettingsMenu;