from setuptools import setup, find_packages

with open('README.md', 'r') as file:
    long_description = file.read()

setup(
    name='snailDB',
    version='0.0.3',
    packages=find_packages(),
    install_requires=[
        'Flask',
    ],
    author='Sreeraj V Rajesh',
    author_email='cyberkutti@gmail.com',
    description='SnailDB, a lightweight, non-SQL database for Python.',
    long_description=long_description,
    long_description_content_type='text/markdown',
    url='https://github.com/cyberkutti-iedc/snailDB',
    license='MIT',
    platforms=['any'],
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
    ],
)
