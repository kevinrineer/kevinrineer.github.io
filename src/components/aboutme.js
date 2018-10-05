import React, { Component } from 'react';
import { Grid, Cell, List, ListItem, ListItemContent } from 'react-mdl';

class About extends Component {
  render() {
    return(
      <div className="about-body">
        <Grid className="about-grid">
          <Cell col={6} id="about-pic-n-contact">
            <img
              
              alt="Kevin Rineer Voice Over"
              src={require('../resources/KevinRineer_FormalAttire.jpg')}
              id="about-pic"/>

            <div className="contact-list">
              <List>
                <ListItem>
                  <ListItemContent style={{fontSize: '30px', fontFamily: 'Anton'}}>
                    <i className="fa fa-phone-square" aria-hidden="true"/>
                    (813) 505-8010
                  </ListItemContent>
                </ListItem>

                <ListItem>
                  <ListItemContent style={{fontSize: '30px', fontFamily: 'Anton'}}>
                    <i className="fa fa-envelope" aria-hidden="true"/>
                    kevin@kevinrineer.com
                  </ListItemContent>
                </ListItem>

                {/* <ListItem>
                  <ListItemContent style={{fontSize: '30px', fontFamily: 'Anton'}}>
                    <i className="fa fa-skype" aria-hidden="true"/>
                    KevinRineerVO
                  </ListItemContent>
                </ListItem> */}


              </List>
            </div>
          </Cell>
          <Cell col={6}>
            <h2>AboutMe</h2>
            <p> I am a voice actor. Hopefully, by now you've figured that much out by yourself.
              I have been "doing voices" all my life, but professionally voice acting has been something I originally did not allow myself to do.
              I thought that I needed to have a "respectable job" as an engineer, so I started on the path of computer engineering for college.
              However, there was no way for me to completely shut my creative side down. I ended up joining the improv team and going to office hours of acting professors, many of whom had little to do during them.
              </p><p>Nowadays, I allow myself to enjoy what I do, which can be seen (well, moreso heard) in everything that I do.
              I do my upmost to ensure that everyone I work with also enjoys the process. I have been told I take direction incredibly well. I'm pretty sure that translates to "you're good to work with"! So, I think I'm doing a good job.
              I'd be happy to work with anyone, so long as they love what they do and appreciate the process. Feel free to contact me (via e-mail preferably) at your earliest convencience.
              I look forward to hearing from you!
              </p>
            
          </Cell>
        </Grid>
      </div>
    )
  }
}

export default About;
