#version 450 core

// Freecam: reproject vanilla's real depth into voxy's projection space and write it into voxy's depth
// buffer. Voxy then renders with its normal closer-equal depth test, so it's hidden exactly where
// vanilla is closer and shows exactly where it's closer - no stencil, no bias, no fake sentinel.
// Pixels with no vanilla geometry are left at FAR (discard here) so voxy renders there freely.

layout(binding = 0) uniform sampler2D vanillaDepthTex;
layout(location = 1) uniform mat4 invVanillaMVP;// inverse of (vanillaProjection * modelView)
layout(location = 2) uniform mat4 voxyMVP;      // viewport.MVP (voxyProjection * modelView)
layout(location = 3) uniform vec2 scaleFactor;

#import <voxy:util/depthutils.glsl>

in vec2 UV;

vec3 unproject(vec3 clip) {
    vec4 v = invVanillaMVP * vec4(SCREEN2NDC(clip), 1.0f);
    return v.xyz / v.w;
}

void main() {
    float depth = texture(vanillaDepthTex, UV * scaleFactor).r;
    if (depth == FAR) {
        discard;// no vanilla geometry along this pixel; leave voxy depth at FAR
    }

    // vanilla window -> world (camera relative) -> voxy clip -> voxy window depth
    vec3 point = unproject(vec3(UV, depth));
    vec4 voxyClip = voxyMVP * vec4(point, 1.0f);
    float d = NDC2SCREEN_DEPTH(voxyClip.z / voxyClip.w);
    gl_FragDepth = gl_DepthRange.diff * d + gl_DepthRange.near;
}
