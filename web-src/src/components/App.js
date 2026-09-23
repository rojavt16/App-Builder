/* 
* <license header>
*/

import React from 'react'
import { Provider, defaultTheme, Grid, View } from '@adobe/react-spectrum'
import ErrorBoundary from 'react-error-boundary'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Header from './Header'
import ActionsForm from './ActionsForm'
import { About } from './About'
import Signup from './Signup'
import Login from './Login'
import Account from './Account'
import ProductList from './ProductList'
import ProductDetail from './ProductDetail'

function App (props) {
  console.log('runtime object:', props.runtime)
  console.log('ims object:', props.ims)

  // use exc runtime event handlers
  // respond to configuration change events (e.g. user switches org)
  props.runtime.on('configuration', ({ imsOrg, imsToken, locale }) => {
    console.log('configuration change', { imsOrg, imsToken, locale })
  })
  // respond to history change events
  props.runtime.on('history', ({ type, path }) => {
    console.log('history change', { type, path })
  })

  return (
    <ErrorBoundary onError={onError} FallbackComponent={fallbackComponent}>
      <Router>
        <Provider theme={defaultTheme} colorScheme={'light'}>
          <Grid
            areas={['header', 'content']}
            columns={['1fr']}
            rows={['auto', '1fr']}
            height='100vh'
          >
            <View gridArea='header'>
              <Header></Header>
            </View>
            <View gridArea='content' padding='size-300' overflow='auto'>
              <Routes>
                <Route path='/' element={<Navigate to='/login' replace />} />
                <Route path='/actions' element={<ActionsForm runtime={props.runtime} ims={props.ims} />}/>
                <Route path='/signup' element={<Signup />}/>
                <Route path='/login' element={<Login />}/>
                <Route path='/products' element={<ProductList />}/>
                <Route path='/products/:sku' element={<ProductDetail />}/>
                <Route path='/account' element={<Account />}/>
                <Route path='/about' element={<About />}/>
              </Routes>
            </View>
          </Grid>
        </Provider>
      </Router>
    </ErrorBoundary>
  )

  // Methods

  // error handler on UI rendering failure
  function onError (e, componentStack) { }

  // component to show if UI fails rendering
  function fallbackComponent ({ componentStack, error }) {
    return (
      <React.Fragment>
        <h1 style={{ textAlign: 'center', marginTop: '20px' }}>
          Something went wrong :(
        </h1>
        <pre>{componentStack + '\n' + error.message}</pre>
      </React.Fragment>
    )
  }
}

export default App
