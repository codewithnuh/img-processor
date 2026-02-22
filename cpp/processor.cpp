#include <emscripten/emscripten.h>
#include <cmath>
#include <algorithm>
#include <stdint.h>

extern "C" {

EMSCRIPTEN_KEEPALIVE
void remove_background(uint8_t* buffer, int width, int height, int targetR, int targetG, int targetB, int threshold) {
    int size = width * height * 4;
    for (int i = 0; i < size; i += 4) {
        int r = buffer[i];
        int g = buffer[i + 1];
        int b = buffer[i + 2];

        // Euclidean distance
        float distance = std::sqrt(
            std::pow(r - targetR, 2) +
            std::pow(g - targetG, 2) +
            std::pow(b - targetB, 2)
        );

        if (distance < (float)threshold) {
            buffer[i + 3] = 0; // Set Alpha to 0
        }
    }
}

EMSCRIPTEN_KEEPALIVE
void enhance_color(uint8_t* buffer, int width, int height, int targetR, int targetG, int targetB, int threshold, float boost_factor) {
    int size = width * height * 4;
    for (int i = 0; i < size; i += 4) {
        int r = buffer[i];
        int g = buffer[i + 1];
        int b = buffer[i + 2];

        // Euclidean distance
        float distance = std::sqrt(
            std::pow(r - targetR, 2) +
            std::pow(g - targetG, 2) +
            std::pow(b - targetB, 2)
        );

        if (distance < (float)threshold) {
            buffer[i] = std::min(255, (int)(r * boost_factor));
            buffer[i + 1] = std::min(255, (int)(g * boost_factor));
            buffer[i + 2] = std::min(255, (int)(b * boost_factor));
        }
    }
}

}
