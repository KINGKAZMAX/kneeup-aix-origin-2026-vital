#pragma once
// HOST TEST STUB, NOT AN ARDUINO CORE.
#include <cstdint>
#include <iostream>
#include <iomanip>
#include <cmath>
#define A0 14
#define A5 19
#define HIGH 1
#define LOW 0
#define OUTPUT 1
#define F(x) x
extern unsigned long fakeUs;
extern int loopNumber;
inline unsigned long micros(){return fakeUs;}
inline unsigned long millis(){return fakeUs/1000;}
inline void delay(unsigned long ms){fakeUs+=ms*1000;}
inline void pinMode(int,int){}
inline void digitalWrite(int pin,int level){if(loopNumber>=0)std::cerr<<"PIN,"<<loopNumber<<","<<fakeUs<<","<<pin<<","<<level<<"\n";}
inline int analogRead(int){
 static unsigned n=0;
 const int values[]={0,512,1023,0,1023,600,250,750,1023,20,512,900};
 return values[n++%12];
}
struct SerialStub {
 void begin(int){}
 template<class T> void print(T v){std::cout<<v;}
 void print(float v,int digits){std::cout<<std::fixed<<std::setprecision(digits)<<v;}
 template<class T> void println(T v){print(v);std::cout<<"\n";}
};
extern SerialStub Serial;
