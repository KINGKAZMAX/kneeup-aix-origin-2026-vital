#define SAMPLE_RATE 500  
#define BAUD_RATE 115200 

#define INPUT_PIN A0 

float valueSum = 0.0;
//int testNum = 15;
float thresholdValue = 66.0;

void setup()
{
  Serial.begin(BAUD_RATE);
  pinMode(A5, OUTPUT);
}

void loop()
{
  static unsigned long past = 0;
  unsigned long present = micros();
  unsigned long interval = present - past;
  past = present;
  static long timer = 0;
  timer -= interval;

  digitalWrite(A5, HIGH);

  if (timer < 0)
  {
    timer += 1000000 / SAMPLE_RATE;
    float sensor_value = analogRead(INPUT_PIN);
    float myoelectricitySignalValue = Filter(sensor_value);
    Serial.println(myoelectricitySignalValue);

    //Serial.println(testNum);
    //testNum --;
    if (myoelectricitySignalValue >= thresholdValue){
      digitalWrite(A5, LOW);
      delay(4000);
      //testNum = 15;
    } else {
      digitalWrite(A5, HIGH);
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
