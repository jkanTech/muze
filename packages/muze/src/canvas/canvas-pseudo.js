/**
 * Canvas is a logical component which houses a visualization by taking multiple variable in different encoding channel.
 * Canvas manages lifecycle of many other logical component and exposes one consistent interface for creation of chart.
 * Canvas is intialized from environment with settings from environment and singleton dependencies.
 *
 * To create an instance of canvas
 * ```
 *  const env = Muze();
 *  const canvas = env.canvas()
 * ```
 *
 *
 * @class
 * @public
 * @namespace Muze
 */

// @warn Pseudo class of Canvas to generate docs. Real Canvas attach method to instance dynamically hence property
// jsdoc on all the mthod is not possible
export default class {
    /**
     * Takes the variable using which the row facets are made. Row facets are horizontal facet. The variables in
     * parameter of the method controls presentation of facets can have {@link http://www.layoutvariation.com |
     * different variations}.
     *
     * @public
     *
     * @param {Array.<string> | null} leftVars Variables using which the left facets are created
     * @param {Array.<string> | null} rightVars Variables using which the right facets are created
     *
     * @return {Canvas} instance of current canvas
     * }
     */
    rows () { /* pseudo definition */ }

    /**
     * Takes the variable using which the column facets are made. Columns facets are verticle facet. The variables in
     * parameter of the method controls presentation of facets can have {@link http://www.layoutvariation.com |
     * different variations}.
     *
     * @public
     *
     * @param {Array.<string> | null} bottomVars Variables using which the bottom facets are created
     * @param {Array.<string> | null} topVars Variables using which the top facets are created
     *
     * @return {Canvas} Instance of current canvas
     * }
     */
    columns () { /* pseudo definition */ }

    /**
     * Takes a variable and assign it to color encoding channel. Color scale is created based on the type of the
     * varaible assigned. If a dimension is passed, the discrete color scale is created. If a measure is passed gradient
     * color scale is created.
     *
     * @public
     *
     * @param {string | object} encoding Name of the variable which is assigned to color encoding channel or an object
     *      containing scale information
     * @param {string} encoding.field Name of the variable
     * @param {string | Array.<string>} encoding.scheme color scheme could be passed as an array of colors or string
     *      name of {@link http://link-to-d3-pallets.com | d3 scale chromatic }. if not passed Muze's default color
     *      scheme is used.
     * @param {Boolean} [encoding.step = false] Determines if step interpolation is needed, if a measure is assigned in
     *      color encoding channel
     * @param {Number | Array.<Number>} [encoding.stops = false] Defines custom stops for a continuous color scale. If
     *      an interger is passed, then that that many uniform buckets are created. This effect is evident if step
     *      interpolation is used. Alternatively passing array of stops acts as domain of the scale where one to one
     *      mapping between stop array and scheme array is established
     *
     * @return {Canvas} Instance of current canvas
     */
    color () { /* pseudo definition */ }

    /**
     * Takes a variable and assign it to shape encoding channel. Shape scale always expect a dimension assigned to the
     * channel.
     *
     * @public
     *
     * @param {string | object} encoding Name of the dimension which is assigned to shape encoding channel or an object
     *      containing scale information.
     * @param {string} encoding.field Name of the dimension
     * @param {Array.<string>} [encoding.range = ['circle', 'diamond', 'star', 'cross', 'square', 'wye', 'triangle']]
     *      Range of shape
     *
     * @return {Canvas} Instance of current canvas
     */
    shape () { /* pseudo definition */ }

    /**
     * Takes a variable and assign it to size encoding channel. Size encoding can take either a measure or a dimension.
     * Size encoding determines size of a mark.
     *
     * @public
     *
     * @param {string | object} encoding Name of the variable which is assigned to size encoding channel or an object
     *      containing scale information.
     * @param {string} encoding.field Name of the variable
     * @param {Array.<string>} [encoding.range = [36, 1000]] Size values. The value here is proportional to area of a
     *      circle
     *
     * @return {Canvas} Instance of current canvas
     */
    size () { /* pseudo definition */ }

    /**
     * Takes a dimension which wont be assigned in any encoding channels but would be used to mantain granulaity of
     * data.
     *
     * @public
     *
     * @param {string | object} encoding Name of the variable which is assigned to size encoding channel or an object
     *      containing scale information.
     * @param {string} encoding.field Name of the variable
     *
     * @return {Canvas} Instance of current canvas
     */
    detail () { /* pseudo definition */ }

    /**
     * Defines custom layers for a given settings of encoding.
     *
     * @public
     *
     * @param {LayerConfig} def Layers definition
     *
     * @return {Canvas} Instance of current canvas
     */
    layers () { /* pseudo definition */ }

    /**
     * Creates named transformed data from root data. Here the data is an instance of a DataModel.
     *
     * ```
     * .transform({
     *      averageLine: [(dm) => dm.groupBy([''], { Horsepower: 'avg'})]
     *  });
     * ```
     *
     * @public
     *
     * @param {Object} def named definition of transformed data. This is a key value pair, where the key is name of the
     *      source and value being the transfromation function. The name is used to refer in layers to invoke and attach
     *      the data source to the layer instance.
     *
     * @return {Canvas} Instance of current canvas
     */
    transform () { /* pseudo definition */ }

    /**
     * Attach a mount point to the canvas. Canvas starts rendering whenever it gets the mount point. However the
     * rendering starts happenning in the next animation frame. Any property change after that triggers the auto render.
     *
     * @public
     *
     * @param {HTMLElement | string} el Reference of html element or css selectors on which the viz will house.
     */
    mount () { /* pseudo definition */ }

    /**
     * Provides the title for a visulization
     *
     * @public
     *
     * @param {string} text Title text. Text returned from `operator.html` is also supported.
     * @param {object} [config] Title configuration.
     * @param {string} [config.position = 'top'] Position of the title text. Options are `'TOP'` or `'BOTTOM'`.
     * @param {string} [config.align= 'left'] Alignment of title text for a particular position.
     *
     * @return {Canvas} Instance of current canvas
     */
    title () { /* pseudo definition */ }

    /**
     * Provides the subtitle for a visulization
     *
     * @public
     *
     * @param {string} text Subtitle text. Text returned from `operator.html` is also supported.
     * @param {object} [config] Subtitle configuration.
     * @param {string} [config.position = 'top'] Position of the subtitle text. Options are `'TOP'` or `'BOTTOM'`.
     * @param {string} [config.align= 'left'] Alignment of sub title text for a particular position.
     *
     * @return {Canvas} Instance of current canvas
     */
    subtitle () { /* pseudo definition */ }

    /**
     * Retrieves an instance of layout which is responsible for layouting. Layout is responsible for creating faceted
     * presentation using table layout.
     *
     * @public
     *
     * @return {GridLayout} Instance of layout attached to canvas.
     */
    layout () { /* pseudo definition */ }

    /**
     * Retrieves the composition for a canvas
     *
     * @public
     *
     * @return {object} Instances of the components which canvas requires to draw the full visualization.
     *      ```
     *          {
     *              layout: // Instance of {@link GridLayout}
     *              legend: // Instance of {@link Legend}
     *              subtitle: // Instance of {@link TextCell} using which the title is rendered
     *              title: // Instance of {@link TextCell} using which the title is rendered
     *              visualGroup: // Instance of {@link visualGroup}
     *          }
     *      ```
     */
    composition () { /* pseudo definition */ }
}
