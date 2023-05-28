import { React, Component, useState, useEffect, useRef, useCallback } from "react";
import './App.css'

const WIDTH = 64;
const HEIGHT = 64;

function NoteVisualizer(props) {
    const canvasRef = useRef();


    const ApplyNotes = (noteArray, treshhold) => {
        if (noteArray.length === 0)
            return

        const context = canvasRef.current.getContext('2d');

        canvasRef.current.width = WIDTH;
        canvasRef.current.height = HEIGHT;

        const pixels = new Array(WIDTH * HEIGHT * 4).fill(255);
        for (var i = 0; i < pixels.length / 4; i++) {

            var width = i % WIDTH;
            var height = Math.floor(i / WIDTH);

            var color = noteArray[width][HEIGHT - height] > treshhold ? 255 : 0

            for (var j = 0; j < 3; j++)
                pixels[4 * i + j] = color

            pixels[4 * i + 3] = 255

        } 

        const imageData = context.createImageData(WIDTH, HEIGHT);
        imageData.data.set(pixels);
        context.putImageData(imageData, 0, 0);

        context.scale(3, 3);
    }

    useEffect(() => {
        if (canvasRef.current === null)
            return
        
        ApplyNotes(props.notes, props.noteTreshhold)
    }, [props.notes, props.noteTreshhold]);
    
    return (
        <div className="pianoRoll">
        <canvas ref={canvasRef}/>
        <div className="songLine" style={{"marginLeft": 1.5625*(props.timeStep-1)+"%"}}></div>
        </div>
    )

}

export default NoteVisualizer;