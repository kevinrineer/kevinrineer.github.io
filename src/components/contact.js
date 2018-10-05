import React, { Component } from 'react';
import { Grid, Cell, List, ListItem, ListItemContent } from 'react-mdl';


class Contact extends Component {
  render() {
    return(
      <div className="contact-body">
        <Grid className="contact-grid" >
          <Cell col={6} id="contact-pic-n-contact">
            <h2>Kevin Rineer</h2>
            <img
              
              alt="Kevin Rineer Voice Over"
              src={require('../resources/KevinRineer_FormalAttire.jpg')}
              id="contact-pic" />
             <p style={{ width: '75%', margin: 'auto', paddingTop: '1em'}}></p>

          </Cell>
          <Cell col={6}>
            <h2>Contact Me</h2>
            <hr/>

            <div className="contact-list">
              <List>
                <ListItem>
                  <ListItemContent>
                    <i className="fa fa-phone-square" aria-hidden="true"/>
                    <span> (813) 505-8010</span>
                  </ListItemContent>
                </ListItem>

                <ListItem>
                  <ListItemContent>
                    <i className="fa fa-envelope" aria-hidden="true"/>
                  kevin@kevinrineer.com
                  </ListItemContent>
                </ListItem>

                <ListItem>
                  <ListItemContent>
                    <i className="fa fa-skype" aria-hidden="true"/>
                    <span> kevin@kevinrineer.com</span>
                  </ListItemContent>
                </ListItem>
                <ListItem>
                  <ListItemContent>
                    <i className="fa fa-discord" aria-hidden="true"/>
                    <span> KevinRineerVO#2104</span>
                  </ListItemContent>
                </ListItem>

                <ListItem>
                  <ListItemContent>
                    <i className="fa fa-twitter-square" aria-hidden="true"/>
                    <span> @KevinRineerVO (DMs open)</span>
                  </ListItemContent>
                </ListItem>
              </List>
            </div>
          </Cell>
        </Grid>
      </div>
    )
  }
}

export default Contact;
