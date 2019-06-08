// vertex shader for model object
const generalObjectVertexShaderSrc = `
    attribute vec4 a_Position;   // vertex position
    attribute vec4 a_Normal;     // normal used to compute reflection
    uniform vec3 u_CameraPosition; // point light position, same as camera position 
    uniform vec3 u_LightDirection; // direction of direction light
    uniform mat4 u_ModelMatrix;  // model matrix, used to compute world coord of vertex
    uniform mat4 u_MvpMatrix;    // matrix to transform vertex
    uniform mat4 u_NormalMatrix; // matrix to transform normal
    uniform vec4 u_Color;        // object color
    uniform vec3 u_AmbientLightColor;
    uniform vec3 u_PointLightColor;
    varying vec4 v_Color;        // vertex color
    varying float v_Dist;        // distance from camera to vertex, used compute fog
    void main() {
        gl_Position = u_MvpMatrix * a_Position;
        
        vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));
        
        float cosThetaOfDirectionLight = max(dot(normal, u_LightDirection), 0.0);
        
        vec3 pointLightDirection = normalize(u_CameraPosition - vec3(u_ModelMatrix * a_Position));
        float cosThetaOfPointLight = max(dot(normal, pointLightDirection), 0.0);
        
        // compute ambient and diffuse color
        vec3 ambient = u_Color.rgb * u_AmbientLightColor;
        vec3 diffuse = u_Color.rgb * (cosThetaOfDirectionLight + cosThetaOfPointLight * u_PointLightColor);
        
        v_Color = vec4(ambient + diffuse, u_Color.a);
        
        // its a estimation with better performance
        v_Dist = gl_Position.w;
    }
`;

// fragment shader for model object
const generalObjectFragmentShaderSrc = `
    precision mediump float;
    varying vec4 v_Color;
    varying float v_Dist;
    void main() {
        float fogFactor = (140.0 - v_Dist) / (120.0 - 55.0);
        vec3 color = mix(vec3(0.0, 0.0, 0.0), vec3(v_Color), clamp(fogFactor, 0.0, 1.0));
        gl_FragColor = vec4(color, v_Color.a);
    }
`;

// vertex shader for box and floor
const texturedObjectVertexShaderSrc = `
    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    attribute vec2 a_TextureCoordinate; // corresponding texture position
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_NormalMatrix;
    uniform mat4 u_ModelMatrix;  // model matrix, used to compute world coord of vertex
    varying vec2 v_TextureCoordinate;
    varying vec3 v_Normal;
    varying vec3 v_Position;
    varying float v_Dist;
    void main() {
        gl_Position = u_MvpMatrix * a_Position;
        v_Position = vec3(u_ModelMatrix * a_Position);
        v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));
        v_TextureCoordinate = a_TextureCoordinate;
        
        v_Dist = gl_Position.w;
    }
`;

// fragment shader for box and floor
const texturedObjectFragmentShaderSrc = `
    precision mediump float;
    uniform sampler2D u_Sampler;
    uniform vec3 u_AmbientLightColor;
    uniform vec3 u_CameraPosition; // point light position, same as camera position
    uniform vec3 u_PointLightColor;
    uniform vec3 u_LightDirection;
    varying float v_cosTheta;
    varying vec2 v_TextureCoordinate;
    varying vec3 v_Normal;
    varying vec3 v_Position;
    varying float v_Dist;        // distance from camera to vertex, used compute fog
    void main() {
        vec4 sampleColor = texture2D(u_Sampler, v_TextureCoordinate);
        
        float cosThetaOfDirectionLight = max(dot(v_Normal, u_LightDirection), 0.0);
        
        vec3 pointLightDirection = normalize(u_CameraPosition - vec3(v_Position));
        float cosThetaOfPointLight = max(dot(v_Normal, pointLightDirection), 0.0);
        
        vec3 ambient = sampleColor.rgb * u_AmbientLightColor;
        vec3 diffuse = sampleColor.rgb * (cosThetaOfDirectionLight + cosThetaOfPointLight * u_PointLightColor);
       
        vec4 color = vec4(ambient + diffuse, sampleColor.a);
        
        float fogFactor = (140.0 - v_Dist) / (120.0 - 55.0);
        vec3 colorWithFog = mix(vec3(0.0, 0.0, 0.0), vec3(color), clamp(fogFactor, 0.0, 1.0));
        
        gl_FragColor = vec4(colorWithFog, color.a);
    }
`;
