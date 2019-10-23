const inquirer = require('inquirer')

module.exports = {
  /**
   * @param {array} questions The question definitions as documented by inquirer
   * @param {object} providedAnswers Existing provided answers given as { name: answer }
   * @return {array} The parsed questions
   */
  buildQuestions(questions, providedAnswers) {
    return questions.map(question => {
      const providedAnswer = providedAnswers[question.name]

      // Keep the question if there's no provided answer
      if (!providedAnswer) {
        return question
      }

      const {validate} = question

      // Assume the answer is valid if no validate function is given
      if (!validate) {
        return false
      }

      const validationResponse = validate(providedAnswer)

      // If the validation is true, then discard the question
      if (validationResponse === true) {
        return false
      }

      // Otherwise update the question with some feedback
      return {
        ...question,
        message: `${validationResponse}. ${question.message}`,
      }
    }).filter(question => Boolean(question))
  },

  async ask(questions, existingValidAnswers) {
    const newQuestions = this.buildQuestions(questions, existingValidAnswers)

    if (newQuestions.length === 0) {
      return existingValidAnswers
    }

    return {
      ...existingValidAnswers,
      ...await inquirer.prompt(newQuestions),
    }
  },
}
