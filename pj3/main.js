// @author zxn
// CG PJ 3, 2019/6/8

// some camera parameters
const camera = {
    eye: CameraPara.eye,
    at: CameraPara.at,
    up: CameraPara.up,
    fov: CameraPara.fov,
    near: CameraPara.near,
    far: CameraPara.far,
    aspect: 1
};

let totalResourceToLoad = 8;

function main() {
    const canvas = document.getElementById("webgl");
    const hud = document.getElementById("hud");
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        console.log('failed to get the rendering context for WebGL');
        return;
    }
    gl.canvas = canvas;

    // init aspect radio
    canvas.width = hud.width = canvas.clientWidth;
    canvas.height = hud.height = canvas.clientHeight;
    camera.aspect = canvas.width / canvas.height;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // initialize shaders
    const generalProgram = createProgram(gl, generalObjectVertexShaderSrc, generalObjectFragmentShaderSrc);
    const textureProgram = createProgram(gl, texturedObjectVertexShaderSrc, texturedObjectFragmentShaderSrc);
    if (!generalProgram || !textureProgram) {
        console.log('failed to initialize shaders.');
        return;
    }

    // get variable positions
    if (!assignVariablePositionToProgramObject(gl, generalProgram,
        ['a_Position', 'a_Normal', 'u_ModelMatrix', 'u_MvpMatrix', 'u_NormalMatrix', 'u_LightDirection', 'u_Color',
            'u_AmbientLightColor', 'u_PointLightColor', 'u_CameraPosition'])) {
        return;
    }

    // get variable positions
    if (!assignVariablePositionToProgramObject(gl, textureProgram,
        ['a_Position', 'a_Normal', 'u_ModelMatrix', 'u_MvpMatrix', 'u_NormalMatrix', 'a_TextureCoordinate', 'u_Sampler',
            'u_AmbientLightColor', 'u_LightDirection', 'u_PointLightColor', 'u_CameraPosition'])) {
        return;
    }

    // assign ambient light color and directional light color
    gl.useProgram(textureProgram);
    gl.uniform3f(textureProgram.u_AmbientLightColor, ...sceneAmbientLight);
    gl.uniform3f(textureProgram.u_LightDirection, ...sceneDirectionLight);

    // assign ambient light color and directional light color
    gl.useProgram(generalProgram);
    gl.uniform3f(generalProgram.u_AmbientLightColor, ...sceneAmbientLight);
    gl.uniform3f(generalProgram.u_LightDirection, ...sceneDirectionLight);

    // set the vertex information of textured objects
    const box = getTexturedObject(gl, boxRes, textureProgram);
    const floor = getTexturedObject(gl, floorRes, textureProgram);
    if (!box || !floor) {
        return;
    }

    // get all textured objects (box, floor)
    const texturedObjects = [box, floor];

    // get all model objects
    const modelObjects = [];
    for (let modelInfo of ObjectList) {
        modelObjects.push(getModelObject(gl, modelInfo, generalProgram));
    }

    // set the clear color and enable the depth test
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const waitResourceLoad = () => {
        setTimeout(() => {
            if (totalResourceToLoad > 0) {
                // there's some resources to be loaded, continue wait
                waitResourceLoad();
            } else {
                // load finish, draw
                console.log('all resources loaded success');
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                drawObjects(gl, textureProgram, texturedObjects, generalProgram, modelObjects);
                setKeyboardEventListeners(gl, textureProgram, texturedObjects, generalProgram, modelObjects);
            }
        }, 50);
    };

    // wait resource load
    waitResourceLoad();
}

// simply draw all object
function drawObjects(gl, textureProgram, texturedObjects, generalProgram, modelObjects) {
    for (let object of texturedObjects) {
        drawTexturedObject(gl, textureProgram, object);
    }
    for (let object of modelObjects) {
        drawModelObject(gl, generalProgram, object);
    }
}

// draw one model object
function drawModelObject(gl, program, object) {
    // use given program
    gl.useProgram(program);

    // init attribute variables
    initAttributeVariable(gl, program.a_Position, object.vertexBuffer);
    initAttributeVariable(gl, program.a_Normal, object.normalBuffer);

    // compute many transform matrix
    const modelMatrix = object.transform;
    const viewMatrix = new Matrix4().setLookAt(...camera.eye, ...camera.at, ...camera.up);
    const projMatrix = new Matrix4().setPerspective(camera.fov, camera.aspect, camera.near, camera.far);
    const mvpMatrix = new Matrix4().set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
    const normalMatrix = new Matrix4().setInverseOf(modelMatrix).transpose(); // inverse of model, not mvp!

    // pass to shader
    gl.uniformMatrix4fv(program.u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_NormalMatrix, false, normalMatrix.elements);
    gl.uniform4f(program.u_Color, ...object.color, 1.0);
    gl.uniform3f(program.u_CameraPosition, ...camera.eye);

    // bind element array buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.indexBuffer);

    // draw
    gl.drawElements(gl.TRIANGLES, object.numIndices, object.indexBuffer.type, 0);
}

// draw one textured object (cube and floor)
function drawTexturedObject(gl, program, object) {
    // use given program
    gl.useProgram(program);

    // init attribute variables
    initAttributeVariable(gl, program.a_Position, object.vertexBuffer);
    initAttributeVariable(gl, program.a_Normal, object.normalBuffer);
    initAttributeVariable(gl, program.a_TextureCoordinate, object.texCoordBuffer);

    const modelMatrix = object.transform;
    const viewMatrix = new Matrix4().setLookAt(...camera.eye, ...camera.at, ...camera.up);
    const projMatrix = new Matrix4().setPerspective(camera.fov, camera.aspect, camera.near, camera.far);
    const mvpMatrix = new Matrix4().set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
    const normalMatrix = new Matrix4().setInverseOf(modelMatrix).transpose(); // inverse of model, not mvp!

    gl.uniformMatrix4fv(program.u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_NormalMatrix, false, normalMatrix.elements);
    gl.uniform3f(program.u_CameraPosition, ...camera.eye);

    // bind element array buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.indexBuffer);

    // active and build texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, object.texture);

    // draw
    gl.drawElements(gl.TRIANGLES, object.numIndices, object.indexBuffer.type, 0);
}

let xMove = 0, yMove = 0;

function setKeyboardEventListeners(gl, textureProgram, texturedObjects, generalProgram, modelObjects) {
    // if pressing.key is true, then key is pressed
    const pressing = {
        w: false, a: false, s: false, d: false,
        j: false, k: false, l: false, i: false,
        f: false,
    };

    document.addEventListener("keyup", ev => {
        if (pressing.hasOwnProperty(ev.key)) {
            pressing[ev.key] = false;
        }
    });

    mipmapOn = false;
    document.addEventListener("keydown", ev => {
        if (pressing.hasOwnProperty(ev.key.toLowerCase())) {
            pressing[ev.key.toLowerCase()] = true;
        }
        if (ev.key.toLowerCase() === "m") {
            if (mipmapOn) {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            }
            mipmapOn = !mipmapOn;
        }
    });

    const hud = document.getElementById("hud");

    gl.canvas.addEventListener("click", ev => {
        if (!document.pointerLockElement) {
            gl.canvas.requestPointerLock();
        }
    });
    document.addEventListener("mousemove", ev => {
        xMove = ev.movementX;
        yMove = ev.movementY;
    });

    const monitorKeyboard = (lastTime) => {
        requestAnimationFrame(() => {
            let now = Date.now();
            const elapsed = (now - lastTime) / 1000;

            if (gl.canvas.width !== gl.canvas.clientWidth || gl.canvas.height !== gl.canvas.clientHeight) {
                gl.canvas.width = hud.width = gl.canvas.clientWidth;
                gl.canvas.height = hud.height = gl.canvas.clientHeight;
                console.log(gl.canvas.width + " * " + gl.canvas.height);
                camera.aspect = gl.canvas.width / gl.canvas.height;
                gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            }

            const ctx = hud.getContext("2d");
            hud.width = hud.width;
            ctx.font = '20px "Times New Roman"';
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.fillText(`eye: ${camera.eye[0].toFixed(2)}, ${camera.eye[1].toFixed(2)}, ${camera.eye[2].toFixed(2)}`
            , 25, 25);
            ctx.fillText(`at: ${camera.at[0].toFixed(2)}, ${camera.at[1].toFixed(2)}, ${camera.at[2].toFixed(2)}`
                , 25, 50);
            ctx.fillText(`up: ${camera.up[0].toFixed(2)}, ${camera.up[1].toFixed(2)}, ${camera.up[2].toFixed(2)}`
                , 25, 75);
            ctx.fillText( `light [F]: ${pressing.f ? 'OPEN' : 'CLOSE'}`, 25, 100);
            ctx.fillText( `mipmap [M]: ${mipmapOn ? 'OPEN' : 'CLOSE'}`, 25, 125);
            ctx.fillText( `FPS: ${Math.trunc(1000 / (now - lastTime))}`, 25, 150);
            ctx.fillText( "1. CLICK THE CANVAS TO CONTROL CAMERA WITH YOUR MOUSE", 25, hud.height - 50);
            ctx.fillText( "2. PRESS [W] [A] [S] [D] TO MOVE", 25, hud.height - 25);

            ctx.beginPath();
            ctx.moveTo(hud.width / 2 - 20, hud.height / 2);
            ctx.lineTo(hud.width / 2 + 20, hud.height / 2);
            ctx.moveTo(hud.width / 2, hud.height / 2 - 20);
            ctx.lineTo(hud.width / 2, hud.height / 2 + 20);
            ctx.closePath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.stroke();

            let someKeyPressed = false;
            for (let key in pressing) {
                if (pressing[key]) {
                    someKeyPressed = true;
                    break;
                }
            }

            if (!someKeyPressed && xMove === 0 && yMove === 0) {
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                gl.useProgram(generalProgram);
                gl.uniform3f(generalProgram.u_PointLightColor, 0.0, 0.0, 0.0);
                gl.useProgram(textureProgram);
                gl.uniform3f(textureProgram.u_PointLightColor, 0.0, 0.0, 0.0);

                // do animation
                animate(texturedObjects, modelObjects, elapsed);
                drawObjects(gl, textureProgram, texturedObjects, generalProgram, modelObjects);
                monitorKeyboard(now);
                return;
            }

            // assign point light color
            if (pressing.f) {
                // open point light
                gl.useProgram(generalProgram);
                gl.uniform3f(generalProgram.u_PointLightColor, ...scenePointLightColor);
                gl.useProgram(textureProgram);
                gl.uniform3f(textureProgram.u_PointLightColor, ...scenePointLightColor);
            } else {
                // close point light
                gl.useProgram(generalProgram);
                gl.uniform3f(generalProgram.u_PointLightColor, 0.0, 0.0, 0.0);
                gl.useProgram(textureProgram);
                gl.uniform3f(textureProgram.u_PointLightColor, 0.0, 0.0, 0.0);
            }

            // move and rotate camera
            moveAndRotateCamera(camera, elapsed, pressing);

            // draw
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            // do animation
            animate(texturedObjects, modelObjects, elapsed);
            drawObjects(gl, textureProgram, texturedObjects, generalProgram, modelObjects);

            // continue monitor
            monitorKeyboard(now);
        });
    };

    monitorKeyboard(Date.now());
}

function drawHud() {
    const hudCanvas = document.getElementById("hud");

}

// move and rotate camera according to elapsed time and pressed key
function moveAndRotateCamera(camera, elapsed, pressing) {
    let viewDirection = VectorNormalize(VectorMinus(new Vector3(camera.at), new Vector3(camera.eye)));
    let rightDirection = VectorNormalize(VectorCross(viewDirection, new Vector3(camera.up)));

    // compute rotateAxis to rotate camera
    const rotateStep = ROT_VELOCITY * elapsed;
    let rotateAxis = new Vector3();

    if (pressing.i) {
        rotateAxis = VectorAdd(rotateAxis, rightDirection);
    } else if (pressing.k) {
        rotateAxis = VectorMinus(rotateAxis, rightDirection);
    }

    if (pressing.j) {
        rotateAxis = VectorAdd(rotateAxis, new Vector3(camera.up));
    } else if (pressing.l) {
        rotateAxis = VectorMinus(rotateAxis, new Vector3(camera.up));
    }

    // rotate camera according pressing
    rotateCamera(rotateStep, rotateAxis);

    // rotate camera according mouse movement
    if (document.pointerLockElement) {
        rotateCamera(-xMove * 0.1, new Vector3([0.0, 1.0, 0.0]));

        viewDirection = VectorNormalize(VectorMinus(new Vector3(camera.at), new Vector3(camera.eye)));
        rightDirection = VectorNormalize(VectorCross(viewDirection, new Vector3(camera.up)));
        rotateCamera(-yMove * 0.1, rightDirection);
        xMove = yMove = 0;
    }

    // compute moveVector to move camera
    const moveStep = MOVE_VELOCITY * elapsed;
    let moveVector = new Vector3();

    if (pressing.w) {
        moveVector = VectorAdd(moveVector, viewDirection);
    } else if (pressing.s) {
        moveVector = VectorMinus(moveVector, viewDirection);
    }

    if (pressing.d) {
        moveVector = VectorAdd(moveVector, rightDirection);
    } else if (pressing.a) {
        moveVector = VectorMinus(moveVector, rightDirection);
    }

    moveVector = VectorMultNum(VectorNormalize(moveVector), moveStep);

    // move camera
    camera.eye = VectorAdd(moveVector, new Vector3(camera.eye)).elements;
    camera.at = VectorAdd(moveVector, new Vector3(camera.at)).elements;
}

function rotateCamera(rotateStep, rotateAxis) {
    if (rotateStep !== 0 && (rotateAxis.elements[0] !== 0 || rotateAxis.elements[1] !== 0 || rotateAxis.elements[2] !== 0)) {
        const rotateMat = new Matrix4().setRotate(rotateStep, ...rotateAxis.elements);
        let eyeVec = new Vector3(camera.eye);
        let atVec = new Vector3(camera.at);
        let upVec = new Vector3(camera.up);

        let viewDirection = VectorMinus(atVec, eyeVec);
        viewDirection = rotateMat.multiplyVector3(viewDirection);

        upVec = rotateMat.multiplyVector3(upVec);

        atVec = VectorAdd(eyeVec, viewDirection);

        camera.at = atVec.elements;
        camera.up = upVec.elements;
    }
}

// do some animation according to elapsed time (second)
function animate(texturedObjects, modelObjects, elapsed) {
    texturedObjects[0].transform.rotate(elapsed * 30, 0.0, 1.0, 0.0);
    modelObjects[4].transform.rotate(elapsed * 180, 0.0, 0.0, 1.0);
}
