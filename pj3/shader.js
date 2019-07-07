// vertex shader for model object
const generalObjectVertexShaderSrc = `
    attribute vec4 a_Position;   // vertex position
    attribute vec4 a_Normal;     // normal used to compute reflection
    
    uniform mat4 u_MvpMatrix;    // matrix to transform vertex
    uniform mat4 u_NormalMatrix; // matrix to transform normal
   
    varying vec4 v_Color;        // vertex color
    varying vec4 v_Position;
    varying vec3 v_Normal;
    varying float v_Dist; // distance from camera
    
    void main() {
        gl_Position = u_MvpMatrix * a_Position;
        v_Dist = gl_Position.w;
        v_Position = a_Position;
        v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));
    }
`;

// fragment shader for model object
const generalObjectFragmentShaderSrc = `
    precision mediump float;
    
    uniform vec3 u_CameraPosition; // point light position, same as camera position 
    uniform vec3 u_LightDirection; // direction of direction light
    uniform mat4 u_ModelMatrix;  // model matrix, used to compute world coord of vertex
    uniform vec4 u_Color;        // object color
    uniform vec3 u_AmbientLightColor;
    uniform vec3 u_PointLightColor;
    
    varying vec3 v_Normal;
    varying vec4 v_Position;
    varying float v_Dist; // distance from camera
    
    void main() {
        float cosThetaOfDirectionLight = max(dot(v_Normal, u_LightDirection), 0.0);
        
        vec3 v_PositionInWorld = vec3(u_ModelMatrix * v_Position);
        vec3 pointLightDirection = normalize(u_CameraPosition - v_PositionInWorld);
        float cosThetaOfPointLight = max(dot(v_Normal, pointLightDirection), 0.0);
        
        // compute ambient and diffuse color
        vec3 ambient = u_Color.rgb * u_AmbientLightColor;
        vec3 diffuse = u_Color.rgb * (cosThetaOfDirectionLight + cosThetaOfPointLight * u_PointLightColor);
        
        vec3 color = ambient + diffuse;
        
        float fogFactor = (160.0 - v_Dist) / (160.0 - 30.0);
        color = mix(vec3(0.7, 0.7, 0.7), color, clamp(fogFactor, 0.0, 1.0));
        gl_FragColor = vec4(color, u_Color.a);
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
    varying vec3 v_PositionInWorld;
    varying float v_Dist; // distance from camera
    
    void main() {
        gl_Position = u_MvpMatrix * a_Position;
        v_PositionInWorld = vec3(u_ModelMatrix * a_Position);
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
    varying vec3 v_PositionInWorld;
    varying float v_Dist;        // distance from camera to vertex, used compute fog
    
    void main() {
        vec4 sampleColor = texture2D(u_Sampler, v_TextureCoordinate);
        
        float cosThetaOfDirectionLight = max(dot(v_Normal, u_LightDirection), 0.0);
        
        vec3 pointLightDirection = normalize(u_CameraPosition - v_PositionInWorld);
        float cosThetaOfPointLight = max(dot(v_Normal, pointLightDirection), 0.0);
        
        vec3 ambient = sampleColor.rgb * u_AmbientLightColor;
        vec3 diffuse = sampleColor.rgb * (cosThetaOfDirectionLight + cosThetaOfPointLight * u_PointLightColor);
       
        vec4 color = vec4(ambient + diffuse, sampleColor.a);
        
        float fogFactor = (160.0 - v_Dist) / (160.0 - 30.0);
        vec3 colorWithFog = mix(vec3(0.7, 0.7, 0.7), vec3(color), clamp(fogFactor, 0.0, 1.0));
        
        gl_FragColor = vec4(colorWithFog, color.a);
    }
`;
