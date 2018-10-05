import React from 'react';
import { Switch, Route } from 'react-router-dom';

import LandingPage from './landingpage';
import AboutMe from './aboutme';
import Contact from './contact';

const Main = () => (
  <Route>
    <Switch>
      <Route exact path="/" component={LandingPage} />
      <Route path={'/about'} component={AboutMe} />
      <Route path={'/contact'} component={Contact} />
    </Switch>
  </Route>
)

export default Main;
