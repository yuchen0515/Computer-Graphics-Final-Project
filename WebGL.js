var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    attribute vec2 a_TexCoord;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_modelMatrix;
    uniform mat4 u_normalMatrix;
    uniform mat4 u_MvpMatrixOfLight;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    void main(){
        gl_Position = u_MvpMatrix * a_Position;
        v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
        v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
        v_TexCoord = a_TexCoord;
    }    
`;

//using lab07
var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec3 u_LightPosition;
    uniform vec3 u_ViewPosition;
    uniform float u_Ka;
    uniform float u_Kd;
    uniform float u_Ks;
    uniform float u_shininess;
    uniform sampler2D u_Sampler;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    void main(){
        // let ambient and diffuse color are u_Color 
        // (you can also input them from ouside and make them different)
        //
        vec3 texColor = texture2D( u_Sampler, v_TexCoord ).rgb;

        vec3 ambientLightColor = texColor;
        vec3 diffuseLightColor = texColor;

        // assume white specular light (you can also input it from ouside)
        vec3 specularLightColor = vec3(1.0, 1.0, 1.0);        

        vec3 ambient = ambientLightColor * u_Ka;

        vec3 normal = normalize(v_Normal);
        vec3 lightDirection = normalize(u_LightPosition - v_PositionInWorld);
        float nDotL = max(dot(lightDirection, normal), 0.0);
        vec3 diffuse = diffuseLightColor * u_Kd * nDotL;

        vec3 specular = vec3(0.0, 0.0, 0.0);
        if(nDotL > 0.0) {
            vec3 R = reflect(-lightDirection, normal);
            // V: the vector, point to viewer       
            vec3 V = normalize(u_ViewPosition - v_PositionInWorld); 
            float specAngle = clamp(dot(R, V), 0.0, 1.0);
            specular = u_Ks * pow(specAngle, u_shininess) * specularLightColor; 
        }

        gl_FragColor = vec4( ambient + diffuse + specular, 1.0 );
    }
`;


var VSHADER_SOURCE_ENVCUBE = `
    attribute vec4 a_Position;
    varying vec4 v_Position;
    void main(){
        v_Position = a_Position;
        gl_Position = a_Position;

    }
`


var FSHADER_SOURCE_ENVCUBE = `
    precision mediump float;
    uniform samplerCube u_envCubeMap;
    uniform mat4 u_viewDirectionProjectionInverse;
    varying vec4 v_Position;
    void main(){
        vec4 t = u_viewDirectionProjectionInverse * v_Position;
        gl_FragColor = textureCube(u_envCubeMap, normalize(t.xyz / t.w));

    }
`


function compileShader(gl, vShaderText, fShaderText){
    //////Build vertex and fragment shader objects
    var vertexShader = gl.createShader(gl.VERTEX_SHADER)
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    //The way to  set up shader text source
    gl.shaderSource(vertexShader, vShaderText)
    gl.shaderSource(fragmentShader, fShaderText)
    //compile vertex shader
    gl.compileShader(vertexShader)
    if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)){
        console.log('vertex shader ereror');
        var message = gl.getShaderInfoLog(vertexShader); 
        console.log(message);//print shader compiling error message
    }
    //compile fragment shader
    gl.compileShader(fragmentShader)
    if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)){
        console.log('fragment shader ereror');
        var message = gl.getShaderInfoLog(fragmentShader);
        console.log(message);//print shader compiling error message
    }

    /////link shader to program (by a self-define function)
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    //if not success, log the program info, and delete it.
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
        alert(gl.getProgramInfoLog(program) + "");
        gl.deleteProgram(program);
    }

    return program;
}

/////BEGIN:///////////////////////////////////////////////////////////////////////////////////////////////
/////The folloing three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////
function initAttributeVariable(gl, a_attribute, buffer){
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
}

function initArrayBufferForLaterUse(gl, data, num, type) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Store the necessary information to assign the object to the attribute variable later
  buffer.num = num;
  buffer.type = type;

  return buffer;
}

function initVertexBufferForLaterUse(gl, vertices, normals, texCoords){
  var nVertices = vertices.length / 3;

  var o = new Object();
  o.vertexBuffer = initArrayBufferForLaterUse(gl, new Float32Array(vertices), 3, gl.FLOAT);
  if( normals != null ) o.normalBuffer = initArrayBufferForLaterUse(gl, new Float32Array(normals), 3, gl.FLOAT);
  if( texCoords != null ) o.texCoordBuffer = initArrayBufferForLaterUse(gl, new Float32Array(texCoords), 2, gl.FLOAT);
  //you can have error check here
    o.numVertices = nVertices;

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return o;
}
/////END://///////////////////////////////////////////////////////////////////////////////////////////////
/////The folloing three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

///// normal vector calculation (for the cube)
function getNormalOnVertices(vertices){
  var normals = [];
  var nTriangles = vertices.length/9;
  for(let i=0; i < nTriangles; i ++ ){
      var idx = i * 9 + 0 * 3;
      var p0x = vertices[idx+0], p0y = vertices[idx+1], p0z = vertices[idx+2];
      idx = i * 9 + 1 * 3;
      var p1x = vertices[idx+0], p1y = vertices[idx+1], p1z = vertices[idx+2];
      idx = i * 9 + 2 * 3;
      var p2x = vertices[idx+0], p2y = vertices[idx+1], p2z = vertices[idx+2];

      //var ux = p2x - p0x, uy = p2y - p0y, uz = p2z - p0z;
      //var vx = p1x - p0x, vy = p1y - p0y, vz = p1z - p0z;
                                               
      var ux = p1x - p0x, uy = p1y - p0y, uz = p1z - p0z;
      var vx = p2x - p0x, vy = p2y - p0y, vz = p2z - p0z;

      var norm = Math.sqrt(ux*ux + uy*uy + uz*uz);
      ux = ux / norm;
      uy = uy / norm;
      uz = uz / norm;

      norm = Math.sqrt(vx*vx + vy*vy + vz*vz);
      vx = vx / norm;
      vy = vy / norm;
      vz = vz / norm;

      var nx = uy*vz - uz*vy;
      var ny = uz*vx - ux*vz;
      var nz = ux*vy - uy*vx;

      norm = Math.sqrt(nx*nx + ny*ny + nz*nz);
      nx = nx / norm;
      ny = ny / norm;
      nz = nz / norm;

      normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  }
  return normals;
}

var mouseLastX, mouseLastY;
var mouseDragging = false;
var angleX = 0, angleY = 0;
var gl, canvas;
var modelMatrix;
var normalMatrix;
var nVertex;
var mvpMatrix;
var cameraX = 3, cameraY = 3, cameraZ = 7;
var cameraDirX = 0, cameraDirY = 0, cameraDirZ = 1;

var lamp  = [];
var lampScale = 0.05;
var ground = [];
var cat = [];
var screen = [];

var cube = [];
var cubeObj = [];
var quadObj;
var cubeMapTex;

var transformMat = new Matrix4();
var matStack =[];
var u_modelMatrix;

function pushMatrix(){
    matStack.push(new Matrix4(transformMat));
}

function popMatrix(){
    transformMat = matStack.pop();
}

var textures = {};
var imgNames = ["light-pole-broken.png", "woodfloor.jpg", "cat.png", "cube.png"];
var objCompImgIndex = ["light-pole-broken.png", "woodfloor.jpg", "cat.png", "cube.png"];
var texCount = 0;
var numTextures = imgNames.length;

var offScreenWidth = 2048, offScreenHeight = 2048;
var fbo;

function SetProgram(program){
    gl.useProgram(program);

    program.a_Position = gl.getAttribLocation(program, 'a_Position'); 
    program.a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord'); 
    program.a_Normal = gl.getAttribLocation(program, 'a_Normal'); 
    program.u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix'); 
    program.u_modelMatrix = gl.getUniformLocation(program, 'u_modelMatrix'); 
    program.u_normalMatrix = gl.getUniformLocation(program, 'u_normalMatrix');
    program.u_LightPosition = gl.getUniformLocation(program, 'u_LightPosition');
    program.u_ViewPosition = gl.getUniformLocation(program, 'u_ViewPosition');
    program.u_Ka = gl.getUniformLocation(program, 'u_Ka'); 
    program.u_Kd = gl.getUniformLocation(program, 'u_Kd');
    program.u_Ks = gl.getUniformLocation(program, 'u_Ks');
    program.u_shininess = gl.getUniformLocation(program, 'u_shininess');
    //program.u_Color = gl.getUniformLocation(program, 'u_Color'); 
    program.u_Sampler0 = gl.getUniformLocation(program, "u_Sampler")

}

async function main(){
    canvas = document.getElementById('webgl');
    gl = canvas.getContext('webgl2');
    if(!gl){
        console.log('Failed to get the rendering context for WebGL');
        return ;
    }

    var quad = new Float32Array(
        [
            -1, -1, 1,
            1, -1, 1,
            -1,  1, 1,
            -1,  1, 1,
            1, -1, 1,
            1,  1, 1
        ]); //just a quad

    programEnvCube = compileShader(gl, VSHADER_SOURCE_ENVCUBE, FSHADER_SOURCE_ENVCUBE);
    //gl.useProgram(programEnvCube);

    programEnvCube.a_Position = gl.getAttribLocation(programEnvCube, 'a_Position');
    programEnvCube.u_envCubeMap = gl.getUniformLocation(programEnvCube, 'u_envCubeMap');
    programEnvCube.u_viewDirectionProjectionInverse =
        gl.getUniformLocation(programEnvCube, 'u_viewDirectionProjectionInverse');

    quadObj = initVertexBufferForLaterUse(gl, quad);

    cubeMapTex = initCubeTexture("pos-x.jpg", "neg-x.jpg", "pos-y.jpg", "neg-y.jpg",
        "pos-z.jpg", "neg-z.jpg", 512, 512)

    program = compileShader(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    SetProgram(program);


    /////3D model light
    response = await fetch('light-pole.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i ++ ){
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord);
      lamp.push(o);
    }



    for( let i = 0; i < imgNames.length; i++ ){
      let image = new Image();
      image.onload = function(){initTexture(gl, image, imgNames[i]);};
      image.src = imgNames[i];
    }


    var imagelamp = new Image();
    imagelamp.onload = function(){initTexture(gl, imagelamp, "lampTex");};
    imagelamp.src = "light-pole-broken.png";



    response = await fetch('floor.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i ++ ){
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord);
      ground.push(o);
    }




    var imageground= new Image();
    imageground.onload = function(){initTexture(gl, imageground, "groundTex");};
    imageground.src = "woodfloor.jpg";



    response = await fetch('cat.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i ++ ){
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord);
      cat.push(o);
    }

    var imagecat= new Image();
    imagecat.onload = function(){initTexture(gl, imagecat, "catTex");};
    imagecat.src = "cat.jpg";

    
    response = await fetch('cube.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i ++ ){
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord);
      cube.push(o);
    }

    var imagecube= new Image();
    imagecube.onload = function(){initTexture(gl, imagecube, "cubeTex");};
    imagecube.src = "cube.png";

    response = await fetch('screen.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i ++ ){
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord);
      screen.push(o);
    }


    draw();//draw it once before mouse move

    canvas.onmousedown = function(ev){mouseDown(ev)};
    canvas.onmousemove = function(ev){mouseMove(ev)};
    canvas.onmouseup = function(ev){mouseUp(ev)};
    document.onkeydown = function(ev){keydown(ev)};
}


function draw_rep(cameraX, cameraY, cameraZ, IsCube, IsOffScreen){
    let rotateMatrix = new Matrix4();
    if (IsOffScreen == 0){
        rotateMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
        rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    }else{
        rotateMatrix.setIdentity();
        //rotateMatrix.setRotate(90, 0, 0, 0);//for mouse rotation
        var angle_time = 0;
        rotateMatrix.rotate(90 * angle_time, 0, 1, 0);//for mouse rotation
    }
    var viewDir= new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
    //var viewDir= new Vector3([1, 0, cameraDirZ]);
    var newViewDir = rotateMatrix.multiplyVector3(viewDir);


    var vpFromCamera = new Matrix4();
    vpFromCamera.setPerspective(30, 1, 1, 200);          
    var viewMatrixRotationOnly = new Matrix4();

    viewMatrixRotationOnly.lookAt(cameraX, cameraY, cameraZ, 
        cameraX + newViewDir.elements[0], 
        cameraY + newViewDir.elements[1], 
        cameraZ + newViewDir.elements[2], 
        0, 1, 0);
    //viewMatrixRotationOnly.lookAt(cameraX, cameraY, cameraZ, 0, 0, 0, 0, 1, 0);
    //viewMatrixRotationOnly.lookAt(cameraX, cameraY, cameraZ, cameraX+5, cameraY, cameraZ+5, 0, 1, 0);

    viewMatrixRotationOnly.elements[12] = 0; //ignore translation
    viewMatrixRotationOnly.elements[13] = 0;
    viewMatrixRotationOnly.elements[14] = 0;
    vpFromCamera.multiply(viewMatrixRotationOnly);
    var vpFromCameraInverse = vpFromCamera.invert();

    let mdlMatrix_lamp = new Matrix4(); 
    let mdlMatrix_wood = new Matrix4(); 
    let mdlMatrix_cat = new Matrix4(); 
    let mdlMatrix_cube = new Matrix4(); 
    let mdlMatrix_cube2 = new Matrix4(); 

    mdlMatrix_lamp.translate(16.0, 3.0, 100.0);
    mdlMatrix_lamp.rotate(90, 0, 1, 0);
    mdlMatrix_wood.translate(6.0, -9.0, 100.0);

    mdlMatrix_cat.translate(6.0, -9.0, 100.0);
    mdlMatrix_cat.scale(1.0, 1.0, 1.0);
    mdlMatrix_cat.rotate(90, 0, 1, 0);

    mdlMatrix_cube.translate(9.0, 12.0, 100.0);
    mdlMatrix_cube.scale(5.0, 5.0, 5.0);

    mdlMatrix_cube2.translate(0.0, 15.0, 150.0);
    mdlMatrix_cube2.scale(15.0, 15.0, 0.5);


    if (IsCube){
        drawOneObject(screen, mdlMatrix_cube2, -1, newViewDir, cameraX, cameraY, cameraZ);
    }

    //drawOneObject(lamp, mdlMatrix, 1.0, 0.4, 0.4, 0);
    //drawOneObject(ground, mdlMatrix, 1.0, 0.4, 0.4, 1);
    drawOneObject(lamp, mdlMatrix_lamp, 0, newViewDir, cameraX, cameraY, cameraZ);
    drawOneObject(ground, mdlMatrix_wood, 1, newViewDir, cameraX, cameraY, cameraZ);
    drawOneObject(cat, mdlMatrix_cat, 2, newViewDir, cameraX, cameraY, cameraZ);
    drawOneObject(cube, mdlMatrix_cube, 3, newViewDir, cameraX, cameraY, cameraZ);



    //quad
    gl.useProgram(programEnvCube);


    gl.depthFunc(gl.LEQUAL);
    gl.uniformMatrix4fv(programEnvCube.u_viewDirectionProjectionInverse, 
        false, vpFromCameraInverse.elements);

    gl.activeTexture(gl.TEXTURE0);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTex);

    gl.uniform1i(programEnvCube.u_envCubeMap, 0);
    initAttributeVariable(gl, programEnvCube.a_Position, quadObj.vertexBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, quadObj.numVertices);

}

/////Call drawOneObject() here to draw all object one by one 
////   (setup the model matrix and color to draw)
function draw(){
    fbo = initFrameBuffer(gl);
    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    gl.viewport(0, 0, offScreenWidth, offScreenHeight);
    gl.clearColor(0.0, 0.0, 0.0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    //draw_rep(cameraX, cameraY, cameraZ, 0, 1);
    draw_rep(3, 3, 3, 0, 1);


    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.4,0.4,0.4,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    draw_rep(cameraX, cameraY, cameraZ, 1, 0);
}

//obj: the object components
//mdlMatrix: the model matrix without mouse rotation
//colorR, G, B: object color
//function drawOneObject(obj, mdlMatrix, colorR, colorG, colorB, index){
function drawOneObject(obj, mdlMatrix, index, newViewDir, cameraX, cameraY, cameraZ){

    mvpMatrix = new Matrix4();
    normalMatrix = new Matrix4();

    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);

    mvpMatrix.setPerspective(30, 1, 1, 200);

    //model Matrix (part of the mvp matrix)
    //
    //modelMatrix.setTranslate(1.0, 1.0, 1.0);
    modelMatrix = new Matrix4();
    modelMatrix.setRotate(angleX, 0.0, 1.0, 0.0);//for mouse rotation
    //mvp: projection * view * model matrix  
    modelMatrix.setScale(1.0, 1.0, 1.0);
    //mvpMatrix.setPerspective(30, 1, 1, 100);
    modelMatrix.multiply(mdlMatrix);
    //mvpMatrix.setPerspective(30, 1, 1, 100);
    //mvpMatrix.setPerspective(60, 1, 1, 100);
    //mvpMatrix.lookAt(cameraX, cameraY, cameraZ, 0, 0, 0, 0, 1, 0);
    //mvpMatrix.lookAt(cameraX, cameraY, cameraZ, cameraX+5, cameraY, cameraZ+5, 0, 1, 0);
    //
    mvpMatrix.lookAt(cameraX, cameraY, cameraZ, 
        cameraX + newViewDir.elements[0], 
        cameraY + newViewDir.elements[1], 
        cameraZ + newViewDir.elements[2], 
        0, 1, 0);

    mvpMatrix.multiply(modelMatrix);

    //normal matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    gl.uniform3f(program.u_LightPosition, 8, 32, 200);
    gl.uniform3f(program.u_ViewPosition, 3, 3, 3);
    gl.uniform1f(program.u_Ka, 0.8);
    gl.uniform1f(program.u_Kd, 0.7);
    gl.uniform1f(program.u_Ks, 1.0);
    gl.uniform1f(program.u_shininess, 10.0);
    //gl.uniform3f(program.u_Color, colorR, colorG, colorB);


    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);

    gl.activeTexture(gl.TEXTURE0);

    if (index == -1)
        gl.bindTexture(gl.TEXTURE_2D, fbo.texture); 
    else
        gl.bindTexture(gl.TEXTURE_2D, textures[objCompImgIndex[index]]);
    for( let i=0; i < obj.length; i ++ ){



        gl.uniform1i(program.u_Sampler0, 0);

        initAttributeVariable(gl, program.a_Position, obj[i].vertexBuffer);
        initAttributeVariable(gl, program.a_TexCoord, obj[i].texCoordBuffer);
        initAttributeVariable(gl, program.a_Normal, obj[i].normalBuffer);

        gl.drawArrays(gl.TRIANGLES, 0, obj[i].numVertices);
    }
}

function parseOBJ(text) {
    // because indices are base 1 let's just fill in the 0th data
    const objPositions = [[0, 0, 0]];
    const objTexcoords = [[0, 0]];
    const objNormals = [[0, 0, 0]];

    // same order as `f` indices
    const objVertexData = [
        objPositions,
        objTexcoords,
        objNormals,
    ];

    // same order as `f` indices
    let webglVertexData = [
        [],   // positions
        [],   // texcoords
        [],   // normals
    ];

    const materialLibs = [];
    const geometries = [];
    let geometry;
    let groups = ['default'];
    let material = 'default';
    let object = 'default';

    const noop = () => {};

    function newGeometry() {
        // If there is an existing geometry and it's
        // not empty then start a new one.
        if (geometry && geometry.data.position.length) {
            geometry = undefined;
        }
    }

    function setGeometry() {
        if (!geometry) {
            const position = [];
            const texcoord = [];
            const normal = [];
            webglVertexData = [
                position,
                texcoord,
                normal,
            ];
            geometry = {
                object,
                groups,
                material,
                data: {
                    position,
                    texcoord,
                    normal,
                },
            };
            geometries.push(geometry);
        }
    }

    function addVertex(vert) {
        const ptn = vert.split('/');
        ptn.forEach((objIndexStr, i) => {
            if (!objIndexStr) {
                return;
            }
            const objIndex = parseInt(objIndexStr);
            const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
            webglVertexData[i].push(...objVertexData[i][index]);
        });
    }

    const keywords = {
        v(parts) {
            objPositions.push(parts.map(parseFloat));
        },
        vn(parts) {
            objNormals.push(parts.map(parseFloat));
        },
        vt(parts) {
            // should check for missing v and extra w?
            objTexcoords.push(parts.map(parseFloat));
        },
        f(parts) {
            setGeometry();
            const numTriangles = parts.length - 2;
            for (let tri = 0; tri < numTriangles; ++tri) {
                addVertex(parts[0]);
                addVertex(parts[tri + 1]);
                addVertex(parts[tri + 2]);
            }
        },
        s: noop,    // smoothing group
        mtllib(parts, unparsedArgs) {
            // the spec says there can be multiple filenames here
            // but many exist with spaces in a single filename
            materialLibs.push(unparsedArgs);
        },
        usemtl(parts, unparsedArgs) {
            material = unparsedArgs;
            newGeometry();
        },
        g(parts) {
            groups = parts;
            newGeometry();
        },
        o(parts, unparsedArgs) {
            object = unparsedArgs;
            newGeometry();
        },
    };

    const keywordRE = /(\w*)(?: )*(.*)/;
    const lines = text.split('\n');
    for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
        const line = lines[lineNo].trim();
        if (line === '' || line.startsWith('#')) {
            continue;
        }
        const m = keywordRE.exec(line);
        if (!m) {
            continue;
        }
        const [, keyword, unparsedArgs] = m;
        const parts = line.split(/\s+/).slice(1);
        const handler = keywords[keyword];
        if (!handler) {
            console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
            continue;
        }
        handler(parts, unparsedArgs);
    }

    // remove any arrays that have no entries.
    for (const geometry of geometries) {
        geometry.data = Object.fromEntries(
            Object.entries(geometry.data).filter(([, array]) => array.length > 0));
    }

    return {
        geometries,
        materialLibs,
    };
}

function keydown(ev){ 
    //implment keydown event here
    let rotateMatrix = new Matrix4();
    rotateMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    var viewDir= new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
    var newViewDir = rotateMatrix.multiplyVector3(viewDir);

    if(ev.key == 'w'){ 
        cameraX += (newViewDir.elements[0] * 0.6);
        cameraY += (newViewDir.elements[1] * 0.6);
        cameraZ += (newViewDir.elements[2] * 0.6);
    }
    else if(ev.key == 's'){ 
        cameraX -= (newViewDir.elements[0] * 0.6);
        cameraY -= (newViewDir.elements[1] * 0.6);
        cameraZ -= (newViewDir.elements[2] * 0.6);
    }

    console.log(cameraX, cameraY, cameraZ)
    draw();
}

function mouseDown(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    if( rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom){
        mouseLastX = x;
        mouseLastY = y;
        mouseDragging = true;
    }
}

function mouseUp(ev){ 
    mouseDragging = false;
}

function initCubeTexture(posXName, negXName, posYName, negYName,
    posZName, negZName, imgWidth, imgHeight)
{
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faceInfos = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            fName: posXName,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            fName: negXName,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            fName: posYName,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            fName: negYName,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            fName: posZName,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            fName: negZName,
        },
    ];
    faceInfos.forEach((faceInfo) => {
        const {target, fName} = faceInfo;
        // setup each face so it's immediately renderable
        gl.texImage2D(target, 0, gl.RGBA, imgWidth, imgHeight, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, null);

        var image = new Image();
        image.onload = function(){
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        };
        image.src = fName;
    });
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    return texture;
}


function mouseMove(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;
    if( mouseDragging ){
        var factor = 100/canvas.height; //100 determine the spped you rotate the object
        var dx = factor * (x - mouseLastX);
        var dy = factor * (y - mouseLastY);

        angleX += dx; //yes, x for y, y for x, this is right
        angleY += dy;
    }
    mouseLastX = x;
    mouseLastY = y;

    draw();
}

function initTexture(gl, img, imgName){
    var tex = gl.createTexture();

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Set the parameters so we can render any size image.
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    textures[imgName] = tex;

    texCount++;
    if( texCount == numTextures)draw();
}



function initFrameBuffer(gl){
    //create and set up a texture object as the color buffer
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, offScreenWidth, offScreenHeight,
        0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);


    //create and setup a render buffer as the depth buffer
    var depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 
        offScreenWidth, offScreenHeight);

    //create and setup framebuffer: linke the color and depth buffer to it
    var frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
        gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
        gl.RENDERBUFFER, depthBuffer);
    frameBuffer.texture = texture;
    return frameBuffer;
}

