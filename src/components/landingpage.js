import React, { Component } from 'react';
import { Grid, Cell, List, ListItem, ListItemContent} from 'react-mdl';

class Landing extends Component {
  render() {
  
    return(
      <div style={{width: '100%', margin: 'auto'}}>
        <Grid className="landing-grid">
          <Cell col={12}>
            <img className="avatar-img" 
            src={require('../resources/KevinRineerVO.png')}
            alt="Kevin Rineer Commerial Character Animation Voice Overs" />
            
            <div className="banner-text">
              <h1>Voice Over Actor</h1>

              <hr/>

              <p>Commercial | Animation | Video Games | Audiobook | Explainer Videos</p>

              <div className="audio-players">
              
                <p> Commercial Demo 
                  <br></br>
                  <br></br>
                <audio
                  controls
                  preload="True"
                  width = "100%"
                  src={require("../resources/KevinRineer_Commercial_Demo.mp3")}>
                  Your browser does not support the <code>audio</code> element or you are running on mobile.
                </audio>
                </p>
                <p> Animation Demo 
                  <br></br>
                  <br></br>
                <audio
                  controls
                  preload="True"
                  src={require("../resources/Kevin Rineer_Character_Demo.mp3")}>
                  Your browser does not support the <code>audio</code> element or you are running on mobile.
                </audio>
                </p>
                <p> Video Game Demo 
                  <br></br>
                  <br></br>
                <audio
                  controls
                  preload="True"
                  src={require("../resources/Kevin Rineer_Character_Demo.mp3")}>
                  Your browser does not support the <code>audio</code> element or you are running on mobile.
                </audio>
                </p>
                </div>
                
                <div className="social-links">
                {/* LinkedIn */}
                {/* <a href="http://google.com" rel="noopener noreferrer" target="_blank">
                  <i className="fa fa-linkedin-square" aria-hidden="true" />
                </a> */}

                {/* Youtube 
                <a href="http://google.com" rel="noopener noreferrer" target="_blank">
                  <i className="fa fa-youtube-square" aria-hidden="true" />
                </a> */}
                <div className="landing-contact-list">
                  <i className="fa fa-envelope" aria-hidden="true"/>
                            <span>kevin@kevinrineer.com</span>  
                  <i className="fa fa-phone-square" aria-hidden="true"/>
                  <span>(813) 505-8010</span>
                </div>
                </div>
              
            </div>
            
          </Cell>
        </Grid>
        
      </div>
      
    )
  }
}

export default Landing;
