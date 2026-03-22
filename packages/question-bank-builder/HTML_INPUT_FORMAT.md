chakra-collapse question

css-1t965vy code
css-naa3lg question-text

css-jjzrip correct
    css-xakj1w letter
    css-cba290 text
css-1hd35cf incorrect
    css-xakj1w letter
    css-cba290 text

[...document.querySelectorAll('.chakra-accordion__item')]
  .map(q =>   {
        return {
        "code": q.querySelector('.css-1t965vy').innerText.trim(),
        "question": q.querySelector('.css-naa3lg').innerText.trim(),
        "incorrect": [...q.querySelectorAll('.css-1hd35cf .css-cba290')].map(a => a.innerText.trim()),
        "correct": [...q.querySelectorAll('.css-jjzrip .css-cba290')].map(a => a.innerText.trim()),
        "discussion": [
        ]
    }
  }).slice(0,5)