import * as tf from '@tensorflow/tfjs'

var VECTOR_SIZE = 100;

export async function LoadModel(stateToLoadModelInto) {
    try {
        const model = await tf.loadLayersModel("Model/model.json");

        const response = await fetch("Model/PCA_data.bin");
        const blob = await response.arrayBuffer();
        const arr = new Float32Array(blob)

        const modelEvecs = arr.slice(0, VECTOR_SIZE*VECTOR_SIZE);
        const modelMeans = arr.slice(VECTOR_SIZE*VECTOR_SIZE, VECTOR_SIZE*VECTOR_SIZE+VECTOR_SIZE);
        const modelEvals = arr.slice(VECTOR_SIZE*VECTOR_SIZE+VECTOR_SIZE);

        stateToLoadModelInto.model = { model: model, evecs: modelEvecs, means: modelMeans, evals: modelEvals };
    }
    catch (e) { console.log("Error loading model:\n", e) }

}

export async function Predict(model, predictVector) {
    if (predictVector.length !== VECTOR_SIZE) {
        console.log("Predict vector length is not the correct size. It should be " + VECTOR_SIZE + " but it is " + predictVector.length);
        return [];
    }

    // Do PCA to the vector
    let mul = new Array(predictVector.length);
    for (let i = 0; i < predictVector.length; i++) {
        mul[i] = predictVector[i] * model.evals[i];
    }
    let vector_temp = new Array(VECTOR_SIZE);
    for (let i = 0; i < VECTOR_SIZE; i++) {
        let sum = 0;
        for (let j = 0; j < VECTOR_SIZE; j++) {
            sum += mul[j] * model.evecs[j * VECTOR_SIZE + i];
        }
        vector_temp[i] = sum;
    }
    let vector_new = new Array(vector_temp.length);
    for (let i = 0; i < vector_temp.length; i++) {
        vector_new[i] = vector_temp[i] + model.means[i];
    }

    const result = model.model.predict(tf.tensor([vector_new]));
    return result.arraySync()[0];
}

export function GaussianRandomVector(mean=0, stdev=1) {
    var arr = new Array(VECTOR_SIZE);

    for (var i = 0; i < arr.length; i++) {
        arr[i] = GaussianRandomValue(mean, stdev);
    }

    return arr;
}
export function GaussianRandomValue(mean=0, stdev=1) {
    let u = 1 - Math.random(); // Converting [0,1) to (0,1)
    let v = Math.random();
    let z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}