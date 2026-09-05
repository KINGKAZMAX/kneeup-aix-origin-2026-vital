/*
 AIR-FLOW optional observation firmware (Arduino UNO, A0 input / A5 output).
 BENCH TEST ONLY. This is NOT a pressure controller or a medical safety system.

 Scope: keep original Filter(), threshold 66.0, >= comparison and blocking waits.
 Add NDJSON observations of sampled values and commanded A5 level. No inbound
 serial commands. No AI. No inferred knee angle, pump status or pressure.

 Important: on a threshold hit, original code holds A5 LOW across BOTH waits:
 4000 ms + 1000 ms, then writes HIGH at the start of the next loop. This version
 keeps that behavior, with a small additional serial-output overhead.
 It does NOT make sampling continuous at 500 Hz. Do not retune the filter or
 threshold based only on this UI. Do not flash with the pump powered/attached.

 Startup difference: preload A5 HIGH before OUTPUT mode. HIGH is NOT verified
 as electrically safe for your relay/valve; verify the wiring unpowered first.
*/
#include <Arduino.h>
#define SAMPLE_RATE 500
#define BAUD_RATE 115200
#define INPUT_PIN A0
#define OUTPUT_PIN A5
float thresholdValue = 66.0;
unsigned long sampleSequence = 0;
unsigned long sampleAtMs = 0;
int lastRaw = 0;
float lastEmg = 0.0;
bool haveSample = false;
uint8_t commandedA5 = HIGH;
const char* phase = "idle";

float Filter(float input);
void emitTelemetry() {
  if (!haveSample) return;
  Serial.print(F("{\"v\":1,\"type\":\"telemetry\",\"t_ms\":"));
  Serial.print(millis());
  Serial.print(F(",\"sample_ms\":")); Serial.print(sampleAtMs);
  Serial.print(F(",\"seq\":")); Serial.print(sampleSequence);
  Serial.print(F(",\"raw\":")); Serial.print(lastRaw);
  Serial.print(F(",\"emg\":")); Serial.print(lastEmg, 4);
  Serial.print(F(",\"threshold\":")); Serial.print(thresholdValue, 2);
  Serial.print(F(",\"a5\":\"")); Serial.print(commandedA5 == HIGH ? F("HIGH") : F("LOW"));
  Serial.print(F("\",\"phase\":\"")); Serial.print(phase); Serial.println(F("\"}"));
}
void writeA5(uint8_t level, const char* nextPhase) {
  digitalWrite(OUTPUT_PIN, level);
  commandedA5 = level; phase = nextPhase;
}
void setup() {
  Serial.begin(BAUD_RATE);
  digitalWrite(OUTPUT_PIN, HIGH); // preload output latch; not a verified stop state
  pinMode(OUTPUT_PIN, OUTPUT);
  Serial.println(F("{\"v\":1,\"type\":\"boot\",\"fw\":\"airflow-observer-v1\"}"));
}
void loop() {
  static unsigned long past = 0;
  unsigned long present = micros();
  unsigned long interval = present - past;
  past = present;
  static long timer = 0;
  timer -= interval;

  // Preserve the original loop-start HIGH, not a pressure/valve confirmation.
  const bool changedToHigh = commandedA5 != HIGH;
  writeA5(HIGH, "idle");
  if (changedToHigh) emitTelemetry(); // old sample + actual current commanded level

  if (timer < 0) {
    timer += 1000000 / SAMPLE_RATE;
    lastRaw = analogRead(INPUT_PIN);
    lastEmg = Filter(lastRaw);
    sampleAtMs = millis();
    sampleSequence++;
    haveSample = true;
    if (lastEmg >= thresholdValue) {
      writeA5(LOW, "trigger_hold");
      emitTelemetry();
      delay(4000);
      // Original LOW remains through the following 1000 ms; do not declare OFF.
      phase = "rest";
      emitTelemetry();
    } else {
      writeA5(HIGH, "rest");
      emitTelemetry();
    }
  }
  delay(1000);
}

float Filter(float input)
{ 
  float output = input;
    {
        static float z1, z2; 
        float x = output - (-0.73945727*z1 )- (0.59923508*z2);
        output = 0.00223489*x + (0.00446978*z1 )+ (0.00223489*z2);
        z2 = z1;
        z1 = x;
    }
    
    {
        static float z1, z2; 
        float x = output - (-1.03789224*z1 )- (0.64082390*z2);
        output = 1.00000000*x + (2.00000000*z1 )+ (1.00000000*z2);
        z2 = z1;
        z1 = x;
    }
    
    {
        static float z1, z2; 
        float x = output - (-0.59186255*z1 )- (0.80647974*z2);
        output = 1.00000000*x + (-2.00000000*z1 )+ (1.00000000*z2);
        z2 = z1;
        z1 = x;
    }
    
    {
        static float z1, z2; 
        float x = output - (-1.33318587*z1 )- (0.85392964*z2);
        output = 1.00000000*x + (-2.00000000*z1 )+ (1.00000000*z2);
        z2 = z1;
        z1 = x;
    }
    
  return output;
}
