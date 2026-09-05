#include "Arduino.h"
unsigned long fakeUs=0;
int loopNumber=-1;
SerialStub Serial;
float Filter(float input); // Arduino preprocessor normally provides this prototype.
#include TEST_SKETCH
int main(){setup();for(loopNumber=0;loopNumber<70;loopNumber++){fakeUs+=10;loop();}}
