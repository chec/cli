/**
 * Should we show the logo?
 *
 * @param {object} options Application options
 * @returns {boolean} Whether to show the logo
 */
const showLogo = options => {
  // CLI input: `chec`
  if (typeof options.id === 'undefined') {
    return true
  }

  // CLI input: `chec help`
  if (options.id === 'help') {
    return true
  }

  // CLI input: `chec login --help` or `-h`
  if ([].includes.call(options.argv, '--help') || [].includes.call(options.argv, '-h')) {
    return true
  }

  return false
}

module.exports = async function (options) {
  if (!showLogo(options)) {
    return
  }

  // eslint-disable-next-line no-console
  console.log(`
                          Che         EcC
                        c....c2    2c....:C
                      c........c2   2c.....:C
                    c............c2   2c.....:C
                  c................c2   2c.....:C
                c....................c2   2c.....:C
              c........................c2   2c.....:C
            c............................c2   2c.....:C
          c.......:E2  2c..................c2   2c.....:C
        c........h  $$   2c..................c2   2c.....:C
      c.........:C  $cc$  E....................c2   2c.....:C
    c............h    $$  c......................c2   2c.....:C
  c...............:E    E:.........................c2   2c.....:C
  E............................:C c..................h2   2c...:C
    E........................:C     c..................h2   2hC
      E....................:C         c..................h2
        E................:C             c................:C
          E............:C                 c............:C
            E........:C                     c........:C
              E....:C                         c....:C
                EcC                             EcC

`)
}
