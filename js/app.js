import * as THREE from 'three';
import TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const token = localStorage.getItem('googleToken');
if (!token) {
    window.location.href = 'login.html';
}

// --- GOOGLE SHEETS CONFIGURATION ---
const SPREADSHEET_ID = '***';
const API_KEY = '***';
const RANGE = "A1:F";

let camera, scene, renderer;
let controls;

const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [], tetrahedron: [] };

init();
animate();

async function init() {
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 3000;

    scene = new THREE.Scene();

    let dataRows = [];
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.values && result.values.length > 0) {
            const headers = result.values[0].map(h => h.toLowerCase().trim());

            const nameIdx = headers.indexOf('name');
            const photoIdx = headers.indexOf('photo');
            const ageIdx = headers.indexOf('age');
            const countryIdx = headers.indexOf('country');
            const interestIdx = headers.indexOf('interest');
            const netWorthIdx = headers.findIndex(h => h.includes('net worth'));

            dataRows = result.values.slice(1).map(row => {
                return {
                    name: row[nameIdx] || "N/A",
                    photo: row[photoIdx] || "https://via.placeholder.com/60",
                    age: row[ageIdx] || "?",
                    country: row[countryIdx] || "Earth",
                    interest: row[interestIdx] || "",
                    netWorth: row[netWorthIdx] || "0"
                };
            });
        } else {
            console.error("No data found in sheet");
            return;
        }
    } catch (error) {
        console.error("Error fetching sheet data:", error);
        dataRows = Array(100).fill({ name: "Error", photo: "", age: "0", country: "ERR", interest: "Check Console", netWorth: "0" });
    }

    for (let i = 0; i < dataRows.length; i++) {
        const item = dataRows[i];
        const element = document.createElement('div');
        element.className = 'element';

        const netWorthVal = parseFloat(item.netWorth.replace(/[^0-9.-]+/g, "")) || 0;

        if (netWorthVal > 200000) {
            element.style.backgroundColor = '#3A9F48';
        } else if (netWorthVal > 100000) {
            element.style.backgroundColor = '#FDCA35';
        } else {
            element.style.backgroundColor = '#EF3022';
        }

        const countryDiv = document.createElement('div');
        countryDiv.className = 'country';
        countryDiv.textContent = item.country;
        element.appendChild(countryDiv);

        const ageDiv = document.createElement('div');
        ageDiv.className = 'age';
        ageDiv.textContent = item.age;
        element.appendChild(ageDiv);

        const img = document.createElement('img');
        img.className = 'photo';
        img.src = item.photo;
        img.onerror = function () { this.src = 'https://via.placeholder.com/60'; };
        element.appendChild(img);

        const nameDiv = document.createElement('div');
        nameDiv.className = 'name';
        nameDiv.textContent = item.name;
        element.appendChild(nameDiv);

        const interestDiv = document.createElement('div');
        interestDiv.className = 'interest';
        interestDiv.textContent = item.interest;
        element.appendChild(interestDiv);

        const object = new CSS3DObject(element);
        object.position.x = Math.random() * 4000 - 2000;
        object.position.y = Math.random() * 4000 - 2000;
        object.position.z = Math.random() * 4000 - 2000;
        scene.add(object);

        objects.push(object);
    }

    // --- TABLE LAYOUT ---
    for (let i = 0; i < objects.length; i++) {
        const object = new THREE.Object3D();
        const col = i % 20;
        const row = Math.floor(i / 20);

        object.position.x = (col * 140) - 1330;
        object.position.y = - (row * 180) + 990;

        targets.table.push(object);
    }

    // --- SPHERE LAYOUT ---
    const vector = new THREE.Vector3();
    for (let i = 0, l = objects.length; i < l; i++) {
        const phi = Math.acos(- 1 + (2 * i) / l);
        const theta = Math.sqrt(l * Math.PI) * phi;
        const object = new THREE.Object3D();
        object.position.setFromSphericalCoords(800, phi, theta);
        vector.copy(object.position).multiplyScalar(2);
        object.lookAt(vector);
        targets.sphere.push(object);
    }

    // --- DOUBLE HELIX LAYOUT ---
    for (let i = 0, l = objects.length; i < l; i++) {
        let theta = i * 0.175 + Math.PI;
        if (i % 2 !== 0) {
            theta += Math.PI;
        }

        const y = - (i * 8) + 450;
        const object = new THREE.Object3D();
        object.position.setFromCylindricalCoords(900, theta, y);

        vector.x = object.position.x * 2;
        vector.y = object.position.y;
        vector.z = object.position.z * 2;

        object.lookAt(vector);
        targets.helix.push(object);
    }

    // --- GRID LAYOUT ---
    for (let i = 0; i < objects.length; i++) {
        const object = new THREE.Object3D();
        object.position.x = ((i % 5) * 400) - 800;
        object.position.y = (- (Math.floor(i / 5) % 4) * 400) + 800;
        object.position.z = (Math.floor(i / 20)) * 1000 - 2000;

        targets.grid.push(object);
    }

    // --- TETRAHEDRON LAYOUT ---
    let layer = 0;
    let objIndex = 0;
    const spacing = 180;

    while (objIndex < objects.length) {
        for (let r = 0; r <= layer; r++) {
            for (let c = 0; c <= r; c++) {
                if (objIndex >= objects.length) break;

                const object = new THREE.Object3D();
                object.position.x = (c - r / 2) * spacing;
                object.position.z = (r - layer / 2) * spacing;
                object.position.y = -(layer * spacing * 0.8) + 600;

                targets.tetrahedron.push(object);
                objIndex++;
            }
        }
        layer++;
    }

    renderer = new CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    controls = new TrackballControls(camera, renderer.domElement);
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.addEventListener('change', render);

    document.getElementById('table').addEventListener('click', function () { transform(targets.table, 2000); });
    document.getElementById('sphere').addEventListener('click', function () { transform(targets.sphere, 2000); });
    document.getElementById('helix').addEventListener('click', function () { transform(targets.helix, 2000); });
    document.getElementById('grid').addEventListener('click', function () { transform(targets.grid, 2000); });
    document.getElementById('tetrahedron').addEventListener('click', function () { transform(targets.tetrahedron, 2000); });

    transform(targets.table, 2000);
    window.addEventListener('resize', onWindowResize);
}

function transform(targets, duration) {
    TWEEN.removeAll();
    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        const target = targets[i];

        if (target) {
            new TWEEN.Tween(object.position)
                .to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
                .easing(TWEEN.Easing.Exponential.InOut)
                .start();

            new TWEEN.Tween(object.rotation)
                .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration)
                .easing(TWEEN.Easing.Exponential.InOut)
                .start();
        }
    }

    new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
}

function render() {
    renderer.render(scene, camera);
}
