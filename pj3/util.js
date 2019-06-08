// assign the buffer objects and enable the assignment
// get one model object
function getModelObject(gl, modelInfo) {
    // set the vertex information
    const object = initVertexBuffersFromFile(gl, modelInfo, 1, true); // here must reverse!

    object.color = modelInfo.color;

    // compute transform (model) matrix
    object.transform = new Matrix4();
    for (let transform of modelInfo.transform) {
        if (transform.type === 'translate') {
            object.transform.translate(...transform.content);
        } else if (transform.type === 'scale') {
            object.transform.scale(...transform.content);
        } else if (transform.type === 'rotate') {
            object.transform.rotate(...transform.content);
        } else {
            console.log("unknown transform type " + transform.type);
        }
    }

    return object;
}

// get one textured object (cube and floor)
function getTexturedObject(gl, res, program) {
    // set the vertex information
    const object = initVertexBuffers(gl, new Float32Array(res.vertex), new Float32Array(res.normal),
        new Float32Array(res.texCoord), new Uint16Array(res.index));

    // load texture
    object.texture = initTexture(gl, program, res.texImagePath);

    if (!object.texture) {
        console.log('failed to initialize the texture');
        return null;
    }

    // set transform mat (model mat)
    object.transform = new Matrix4().translate(...res.translate).scale(...res.scale);

    return object;
}

function initAttributeVariable(gl, a_attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}

// get location of shader variables and assign it to the same-name properties of program object.
function assignVariablePositionToProgramObject(gl, program, variables) {
    for (let variableName of variables) {
        program[variableName] = variableName[0] === 'a' ? gl.getAttribLocation(program, variableName) :
            gl.getUniformLocation(program, variableName);
        const fail = variableName[0] === 'a' ? program[variableName] < 0 : !program[variableName];
        if (fail) {
            console.log("fail to get variable location of " + variableName);
            return false;
        }
    }
    return true;
}

function initVertexBuffers(gl, vertices, normals, texCoords, indices) {
    const o = {
        vertexBuffer: initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT),
        normalBuffer: initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT),
        texCoordBuffer: initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT),
        indexBuffer: initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_SHORT),
        numIndices: indices.length,
    };

    if (!o.vertexBuffer || !o.normalBuffer || !o.texCoordBuffer || !o.indexBuffer) {
        console.log("fail to init buffer");
        return null;
    }

    // unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return o;
}

function initVertexBuffersFromFile(gl, modelInfo, scale, reverse) {
    const objDoc = new OBJDoc(modelInfo.objFilePath);
    const o = new Object();

    const request = new XMLHttpRequest();
    request.onreadystatechange = () => {
        if (request.readyState === 4 && request.status !== 404) {
            if (!objDoc.parse(request.responseText, scale, reverse)) {
                console.log("OBJ file " + modelInfo.objFilePath + " parse error");
            }

            const drawInfo = objDoc.getDrawingInfo();

            o.vertexBuffer = initArrayBufferForLaterUse(gl, drawInfo.vertices, 3, gl.FLOAT);
            o.normalBuffer = initArrayBufferForLaterUse(gl, drawInfo.normals, 3, gl.FLOAT);
            o.indexBuffer = initElementArrayBufferForLaterUse(gl, drawInfo.indices, gl.UNSIGNED_SHORT);
            o.numIndices = drawInfo.indices.length;

            if (!o.vertexBuffer || !o.normalBuffer || !o.indexBuffer) {
                console.log("fail to init buffer");
                return null;
            }

            // unbind the buffer object
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

            totalResourceToLoad--;
            console.log("OBJ file " + modelInfo.objFilePath + " parse success");
        }
    };
    request.open('GET', modelInfo.objFilePath, true);
    request.send();

    return o;
}

function initArrayBufferForLaterUse(gl, data, num, type) {
    const buffer = gl.createBuffer();   // create a buffer object
    if (!buffer) {
        console.log('failed to create the buffer object');
        return null;
    }
    // write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // keep the information necessary to assign to the attribute variable later
    buffer.num = num;
    buffer.type = type;

    return buffer;
}

function initElementArrayBufferForLaterUse(gl, data, type) {
    const buffer = gl.createBuffer();　  // create a buffer object
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    // write date into the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

    buffer.type = type;

    return buffer;
}

function initTexture(gl, program, texImagePath) {
    const texture = gl.createTexture();
    if (!texture) {
        console.log('failed to create the texture object');
        return null;
    }

    const image = new Image();
    if (!image) {
        console.log('failed to create the image object');
        return null;
    }

    image.onload = function () {
        // write the image data to texture object
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // flip the image Y coordinate
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // pass the texture unit 0 to u_Sampler
        gl.useProgram(program);
        gl.uniform1i(program.u_Sampler, 0);

        gl.bindTexture(gl.TEXTURE_2D, null); // unbind texture

        totalResourceToLoad--;
        console.log("image " + texImagePath + " load success");
    };

    // Tell the browser to load an Image
    image.src = texImagePath;


    return texture;
}
