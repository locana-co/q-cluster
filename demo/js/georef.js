
/*   
       *  The function convertFromGeodetic converts Geodetic (latitude and longitude in radians)
       *  coordinates to a GEOREF coordinate string.  Precision specifies the
       *  number of digits in the GEOREF string for latitude and longitude:
       *                                  0 for nearest degree
       *                                  1 for nearest ten minutes
       *                                  2 for nearest minute
       *                                  3 for nearest tenth of a minute
       *                                  4 for nearest hundredth of a minute
       *                                  5 for nearest thousandth of a minute
       *
       *    longitude    : Longitude in radians.                  (input)
       *    latitude     : Latitude in radians.                   (input)
       *    precision    : Precision specified by the user.       (input)
       */

function convertMinutesToString(minutes, precision)
{ 
/*    
 *  This function converts minutes to a string of length precision.
 *
 *    minutes       : Minutes to be converted                  (input)
 *    precision     : Length of resulting string               (input)
 *    str           : String to hold converted minutes         (output)
 */

  var divisor;
  var  min;
  divisor = Math.pow(10.0, (5.0 - precision));
  if (minutes == 60.0)
    minutes = 59.999;
  minutes = minutes * 1000;
  min = Math.floor(minutes/divisor);
  return min;
} 

function toGeoRef(latitude, longitude, precision){

var long_min,                           /* number: GEOREF longitude minute part   */
    lat_min,                            /* number: GEOREF latitude minute part    */
    origin_long,                        /* number: Origin longitude (-180 degrees)*/
    origin_lat,                         /* number: Origin latitude (-90 degrees)  */
    letter_number = [],                 /* long integer array: GEOREF letters                 */
    long_min_str = [],                  /* char array: Longitude minute string        */
    lat_min_str = [],                   /* char array: Latitude minute string         */
    i,                                  /* integer: counter in for loop            */
    GEOREFString = ''; 

    var abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ';


                      /* char array:*/

  var LATITUDE_LOW, LATITUDE_HIGH, LONGITUDE_LOW, LONGITUDE_HIGH, MIN_PER_DEG, GEOREF_MINIMUM,
      GEOREF_MAXIMUM, GEOREF_LETTERS, MAX_PRECISION, LETTER_I, LETTER_M, LETTER_O, LETTER_Q, 
      LETTER_Z, LETTER_A_OFFSET, ZERO_OFFSET, PI, DEGREE_TO_RADIAN, RADIAN_TO_DEGREE, QUAD, ROUND_ERROR;        //# Rounding factor                       */

  LATITUDE_LOW = -90.0;           /* Minimum latitude                      */
  LATITUDE_HIGH = 90.0;           /* Maximum latitude                      */
  LONGITUDE_LOW = -180.0;         /* Minimum longitude                     */
  LONGITUDE_HIGH = 360.0;         /* Maximum longitude                     */
  MIN_PER_DEG = 60.0;             /* Number of minutes per degree          */
  GEOREF_MINIMUM = 4;                /* Minimum number of chars for GEOREF    */
  GEOREF_MAXIMUM = 14;               /* Maximum number of chars for GEOREF    */
  GEOREF_LETTERS = 4;                //# Number of letters in GEOREF string    */
  MAX_PRECISION = 5;                 //# Maximum precision of minutes part     */
  LETTER_I = 8;                      //# Index for letter I                    */
  LETTER_M = 12;                     //# Index for letter M                    */
  LETTER_O = 14;                     //# Index for letter O                    */
  LETTER_Q = 16;                     //# Index for letter Q                    */
  LETTER_Z = 25;                     //# Index for letter Z                    */
  LETTER_A_OFFSET = 78;              //# Letter A offset in character set      */
  ZERO_OFFSET = 48;                  //# Number zero offset in character set   */
  PI = 3.14159265358979323e0;     //# PI                                    */
  DEGREE_TO_RADIAN = (PI / 180.0);
  RADIAN_TO_DEGREE = (180.0 / PI);
  QUAD = 15.0;                    //# Degrees per grid square               */
  ROUND_ERROR = 0.0000005;        //# Rounding factor                       */


  //double latitude = geodeticCoordinates->latitude() * RADIAN_TO_DEGREE;
  //double longitude = geodeticCoordinates->longitude() * RADIAN_TO_DEGREE;

  if ((latitude < LATITUDE_LOW) || (latitude > LATITUDE_HIGH)) {
    return null;  
  }

  if (longitude < LONGITUDE_LOW)  {
    return null;  
  }

  if ((precision < 0) || (precision > MAX_PRECISION)) {
    return null;
  }

  if (longitude > 180){
        longitude -= 360;
  }

  origin_long = LONGITUDE_LOW;
  origin_lat = LATITUDE_LOW;
  
  letter_number[0] = Math.round((longitude-origin_long) / QUAD + ROUND_ERROR);

  longitude = longitude - (letter_number[0] * QUAD + origin_long);

  letter_number[2] = Math.round(longitude + ROUND_ERROR);
  
  long_min = (longitude - letter_number[2]) * MIN_PER_DEG;
  


  
  letter_number[1] = Math.floor((latitude - origin_lat) / QUAD + ROUND_ERROR);
  
  latitude = latitude - (letter_number[1] * QUAD + origin_lat);
  
  letter_number[3] = Math.floor(latitude + ROUND_ERROR);
  
  lat_min = (latitude - letter_number[3]) * MIN_PER_DEG;
  
  for (i = 0;i < 4; i++)
  {
    if (letter_number[i] >= LETTER_I)
      letter_number[i] += 1;
    if (letter_number[i] >= LETTER_O)
      letter_number[i] += 1;
  }

  if (letter_number[0] == 26)
  { /* longitude of 180 degrees */
    letter_number[0] = LETTER_Z;
    letter_number[2] = LETTER_Q;
    long_min = 59.999;
  }
  
  if (letter_number[1] == 13)
  { /* latitude of 90 degrees */
    letter_number[1] = LETTER_M;
    letter_number[3] = LETTER_Q;
    lat_min = 59.999;
  }

  for (i=0;i<4;i++){
      GEOREFString = GEOREFString + abc[(letter_number[i])];// + LETTER_A_OFFSET];
    }  
  
  GEOREFString = GEOREFString + convertMinutesToString(long_min,precision);
  GEOREFString = GEOREFString +convertMinutesToString(lat_min,precision);
  
  return GEOREFString;

}
  console.log(toGeoRef(-45.447778, 120.2594444, 4));

  //console.log(toGeoRef(30.274672, 97.740331, 4))